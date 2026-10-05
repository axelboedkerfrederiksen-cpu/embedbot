const EXCERPT_SIZE = 1600;
export const WEBSITE_CONTEXT_LIMIT = 12000;
const ignoredWords = new Set("kan du jeg mig det den der til med for fra har hvad hvor hvordan om og the a an is are do does i you me my we our what where how please tell about".split(" "));

function words(text: string) {
  return [...new Set(text.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]{2,}/gu) || [])]
    .filter(word => !ignoredWords.has(word));
}

// Keep page identities next to their excerpts so selected facts still have
// their source URL. No shared cache: every selection uses this tenant's source.
function excerpts(source: string): string[] {
  return source.split(/(?=^SIDE |^SIDELINKS )/m).flatMap(block => {
    const newline = block.indexOf("\n");
    const header = block.startsWith("SIDE ") && newline >= 0 ? block.slice(0, newline) : "";
    const body = header ? block.slice(newline + 1) : block;
    const parts: string[] = [];
    let current = "";
    const flush = () => {
      if (current.trim()) parts.push([header, current.trim()].filter(Boolean).join("\n"));
      current = "";
    };
    for (const line of body.split("\n")) {
      // Crawler records stay whole, including their URLs and product metadata.
      const record = line.startsWith("PRODUKT ") || line.startsWith('{"');
      if (record) {
        if (current.length + line.length > EXCERPT_SIZE) flush();
        current += line + "\n";
        continue;
      }
      for (let start = 0; start < line.length; ) {
        if (current.length + Math.min(line.length - start, EXCERPT_SIZE) > EXCERPT_SIZE) flush();
        let end = Math.min(start + EXCERPT_SIZE, line.length);
        if (end < line.length) {
          const boundary = line.lastIndexOf(" ", end);
          if (boundary > start + EXCERPT_SIZE / 2) end = boundary;
        }
        current += line.slice(start, end) + "\n";
        if (end === line.length) break;
        flush();
        // Overlap preserves facts that straddle the window boundary.
        start = Math.max(start + 1, end - 240);
      }
    }
    flush();
    return parts;
  });
}

export function selectWebsiteContext(
  source: string,
  query: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  limit = WEBSITE_CONTEXT_LIMIT,
): string {
  if (!source || limit <= 0) return "";
  if (source.length <= limit) return source;
  const current = words(query);
  // The recent topic helps resolve questions such as "And in size M?".
  const preceding = words(history.slice(-2).map(message => message.content).join(" "));
  const scored = excerpts(source).map((text, index) => {
    const searchable = text.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
    const score = current.reduce((sum, word) => sum + (searchable.includes(word) ? 3 : 0), 0)
      + preceding.reduce((sum, word) => sum + (searchable.includes(word) ? 1 : 0), 0);
    return { text, index, score };
  });
  // Include surrounding text when possible: a condition or exception may not
  // repeat the words that made the central excerpt relevant.
  const ranked = scored.map((excerpt, index) => ({
    ...excerpt,
    score: Math.max(excerpt.score, (scored[index - 1]?.score || 0) / 2, (scored[index + 1]?.score || 0) / 2),
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  // A lexical selector cannot establish relevance for every language or
  // paraphrase. Preserve the original knowledge instead of guessing a prefix.
  if (!ranked.some(excerpt => excerpt.score > 0)) return source;
  const selected: typeof ranked = [];
  const seen = new Set<string>();
  let remaining = limit;
  for (const excerpt of ranked) {
    if (seen.has(excerpt.text)) continue;
    const cost = excerpt.text.length + (selected.length ? 2 : 0);
    if (cost > remaining) continue;
    selected.push(excerpt);
    seen.add(excerpt.text);
    remaining -= cost;
  }
  // An unusually large record must not cause an empty context.
  if (!selected.length) return ranked[0]?.text.slice(0, limit) || "";
  return selected.sort((a, b) => a.index - b.index).map(excerpt => excerpt.text).join("\n\n");
}
