export const DEFAULT_PROMPTS = [
  "Hej",
  "Hvad kan du hjælpe mig med?",
  "Hvad tilbyder virksomheden?",
  "Hvad er jeres returpolitik?",
  "Hvordan kontakter jeg jer?",
];

export function normalizeConfig(input) {
  let businessId = String(input.businessId || "").trim();
  let endpoint = String(input.endpoint || "").trim();
  if (businessId.includes("://")) {
    const widget = new URL(businessId);
    businessId = widget.searchParams.get("id") || "";
    endpoint = new URL("/api/chat", widget).href;
  }
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(businessId)) {
    throw new Error("Indsæt et gyldigt chatbot-id eller widget-link med ?id=…");
  }
  const url = new URL(endpoint);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Adressen skal være en HTTP- eller HTTPS-adresse uden loginoplysninger.");
  }
  if (url.pathname === "/") url.pathname = "/api/chat";
  if (url.search || url.hash) throw new Error("API-adressen må ikke have query-parametre eller fragment.");
  if (Array.isArray(input.prompts) && input.prompts.some(prompt => typeof prompt !== "string")) {
    throw new Error("Alle prompts skal være tekster.");
  }
  const prompts = (Array.isArray(input.prompts) ? input.prompts : String(input.prompts || "").split("\n"))
    .map(prompt => String(prompt).trim()).filter(Boolean);
  if (!prompts.length || prompts.some(prompt => prompt.length > 10000)) {
    throw new Error("Skriv mindst én prompt. Hver prompt må højst være 10.000 tegn.");
  }
  const integer = (value, fallback, min, max, name) => {
    const result = Number(value ?? fallback);
    if (!Number.isInteger(result) || result < min || result > max) throw new Error(`${name} skal være mellem ${min} og ${max}.`);
    return result;
  };
  const runs = integer(input.runs, 5, 1, 50, "Gentagelser");
  const warmups = integer(input.warmups, 0, 0, 5, "Opvarmningsrunder");
  const requestCount = prompts.length * (runs + warmups);
  if (requestCount > 50) throw new Error("Testen må højst indeholde 50 kald, inklusive opvarmning. Reducér prompts eller gentagelser.");
  return {
    businessId, endpoint: url.href, prompts, runs, warmups, requestCount,
    timeoutMs: integer(input.timeoutMs, 60000, 100, 180000, "Timeout i millisekunder"),
    delayMs: integer(input.delayMs, 500, 0, 10000, "Pause i millisekunder"),
    label: String(input.label || "").trim(),
  };
}

export function statistics(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, average: null, median: null, p95: null, min: null, max: null };
  const mid = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    average: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    min: sorted[0], max: sorted.at(-1),
  };
}

export function summarize(records, prompts) {
  return prompts.map((prompt, promptIndex) => {
    const attempts = records.filter(record => record.promptIndex === promptIndex && !record.warmup);
    const successes = attempts.filter(record => record.ok);
    return {
      prompt, promptIndex, attempted: attempts.length, successes: successes.length,
      failures: attempts.length - successes.length,
      firstReplyMs: statistics(successes.map(record => record.firstReplyMs)),
      completeMs: statistics(successes.map(record => record.completeMs)),
    };
  });
}

function failureCategory(status, message) {
  if (status === 429 || /rate limit|månedens.*AI-svar|monthly_answer_limit/i.test(message)) return "limit";
  if ([400, 401, 402, 403, 404].includes(status) || /Abonnement kræves|Virksomheden blev ikke fundet/i.test(message)) return "configuration";
  return "request";
}

export async function measureReply(config, prompt, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => performance.now());
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeoutMs);
  const started = now();
  let firstReplyMs = null, text = "", kind = null, httpStatus = null, reader;
  const acceptText = chunk => {
    if (typeof chunk !== "string" || !chunk) return;
    text += chunk;
    if (firstReplyMs === null && text.trim()) firstReplyMs = now() - started;
  };
  try {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
    const response = await fetchImpl(config.endpoint, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stream_events: true, business_id: config.businessId, message: prompt,
        history: [], session: nonce, page_url: new URL(config.endpoint).origin + "/chat-benchmark.html",
      }),
    });
    httpStatus = response.status;
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    const type = response.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      kind = data.kind || "structured";
      acceptText(data.text);
    } else {
      if (!response.body) throw new Error("Svaret mangler en stream.");
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      const events = type.includes("application/x-ndjson");
      let buffer = "";
      const consume = line => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === "error") throw new Error(event.message || "Chatbotten returnerede en fejl.");
        if (event.type === "text") { kind = "text"; acceptText(event.text); }
        if (event.type === "result") {
          if (event.data?.error) throw new Error(event.data.error);
          kind = event.data?.kind || "structured";
          acceptText(event.data?.text);
        }
        // Status and private conversation references are not answer text.
      };
      const consumeChunk = chunk => {
        if (!events) { kind = "text"; acceptText(chunk); return; }
        buffer += chunk;
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          consume(line);
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        consumeChunk(decoder.decode(value, { stream: true }));
      }
      consumeChunk(decoder.decode());
      if (events && buffer.trim()) consume(buffer);
    }
    if (firstReplyMs === null) throw new Error("Chatbotten gav ikke nogen svartekst.");
    return { ok: true, httpStatus, firstReplyMs, completeMs: now() - started, kind, text, error: null, errorCategory: null };
  } catch (error) {
    // Cancel the underlying request too, including malformed/failed streams.
    controller.abort();
    if (reader) await reader.cancel().catch(() => {});
    const message = timedOut ? "Svaret overskred timeout." : options.signal?.aborted ? "Testen blev stoppet." : error.message || "Kaldet fejlede.";
    return {
      ok: false, httpStatus, firstReplyMs, completeMs: null, elapsedMs: now() - started,
      kind, text, error: message,
      errorCategory: options.signal?.aborted ? "cancelled" : timedOut ? "timeout" : failureCategory(httpStatus, message),
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    reader?.releaseLock();
  }
}

function pause(ms, signal) {
  if (signal?.aborted || ms === 0) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); signal?.removeEventListener("abort", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

export async function runBenchmark(input, options = {}) {
  const config = normalizeConfig(input);
  const startedAt = new Date().toISOString();
  const records = [];
  let stopReason = null;
  // Interleave prompts by round. Each request starts a fresh chat, so previous
  // answers never change the meaning or token count of another measured prompt.
  outer: for (let round = 0; round < config.warmups + config.runs; round++) {
    for (let promptIndex = 0; promptIndex < config.prompts.length; promptIndex++) {
      if (options.signal?.aborted) { stopReason = "Testen blev stoppet."; break outer; }
      const warmup = round < config.warmups;
      const result = await measureReply(config, config.prompts[promptIndex], options);
      const record = { promptIndex, prompt: config.prompts[promptIndex], run: warmup ? round + 1 : round - config.warmups + 1, warmup, ...result };
      records.push(record);
      options.onResult?.(record, records);
      if (["limit", "configuration", "cancelled"].includes(result.errorCategory)) { stopReason = result.error; break outer; }
      if (records.length < config.requestCount) await pause(config.delayMs, options.signal);
    }
  }
  if (options.signal?.aborted && !stopReason) stopReason = "Testen blev stoppet.";
  return {
    version: 1, startedAt, finishedAt: new Date().toISOString(), config, records,
    summary: summarize(records, config.prompts),
    stopReason, completed: !stopReason && records.length === config.requestCount,
  };
}

export function resultsCsv(report) {
  const safe = value => {
    let text = String(value ?? "");
    // Prevent prompts or model output from becoming spreadsheet formulas.
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = [["prompt", "run", "warmup", "success", "first_reply_seconds", "complete_seconds", "kind", "http_status", "error", "answer"]];
  for (const record of report.records) {
    rows.push([record.prompt, record.run, record.warmup, record.ok,
      record.firstReplyMs === null ? "" : (record.firstReplyMs / 1000).toFixed(4),
      record.completeMs === null ? "" : (record.completeMs / 1000).toFixed(4),
      record.kind, record.httpStatus, record.error, record.text]);
  }
  return "\ufeff" + rows.map(row => row.map(safe).join(",")).join("\r\n");
}
