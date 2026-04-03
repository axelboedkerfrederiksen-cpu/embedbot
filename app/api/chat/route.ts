import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const ipRateLimit = new Map<string, RateLimitEntry>();

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = ipRateLimit.get(ip);

  if (!current || now >= current.resetAt) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return true;
  }

  current.count += 1;
  ipRateLimit.set(ip, current);
  return false;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Rate limit ramt i demo: maks 15 beskeder pr. dag." },
      { status: 429 }
    );
  }

  const { message, business_id, page_url } = await req.json();
  const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";
  const stablePageUrl = typeof page_url === "string" && page_url.trim() ? page_url.trim() : "";

  if (!stableBusinessId) {
    return NextResponse.json(
      { error: "Mangler business_id." },
      { status: 400 }
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", stableBusinessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const companyName = typeof business?.name === "string" && business.name.trim()
    ? business.name.trim()
    : "denne virksomhed";

  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: message,
  });
  const queryEmbedding = embeddingRes.data[0].embedding;

  const { data: docs } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_business_id: stableBusinessId,
    match_count: 5,
  });

  const context = (docs as Array<{ content?: string }> | null | undefined)
    ?.map((doc) => (typeof doc.content === "string" ? doc.content : ""))
    .filter(Boolean)
    .join("\n\n");

  const businessInfo = `
VIRKSOMHED: ${business?.name || ""}
HJEMMESIDE: ${business?.website_url || ""}
BRANCHE: ${business?.industry || ""}
BESKRIVELSE: ${business?.description || ""}

KONTAKT:
- Email: ${business?.support_email || ""}
- Telefon: ${business?.phone || ""}
- Adresse: ${business?.address || ""}, ${business?.city || ""}

ÅBNINGSTIDER:
- Mandag-fredag: ${business?.hours_weekday || ""}
- Lørdag: ${business?.hours_saturday || ""}
- Søndag: ${business?.hours_sunday || ""}

SUPPORT:
- Svartid: ${business?.response_time || ""}
- Hvis botten ikke kan hjælpe: ${business?.fallback_action || ""}
- Ved klager: ${business?.complaint_action || ""}

PRODUKTER/SERVICES: ${business?.products_services || ""}
LEVERINGSTID: ${business?.delivery_time || ""}
RETURPOLITIK: ${business?.return_policy || ""}
BETALINGSMETODER: ${business?.payment_methods || ""}

FAQ:
${business?.faq || ""}

VALGFRIT:
- CVR: ${business?.cvr || ""}
- Sociale medier: ${business?.social_media || ""}
- Tilbud: ${business?.current_offers || ""}
- Garanti: ${business?.warranty || ""}

EKSTRA INSTRUKSER FRA VIRKSOMHEDEN:
${business?.custom_instructions || "Ingen"}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      {
        role: "system",
        content: `Du er en kundeserviceassistent for ${companyName}.

Her er al information om virksomheden:
${businessInfo}

Derudover har du denne kontekst fra virksomhedens hjemmeside:
${context}

Følg disse regler STRENGT:
1. Svar KUN på spørgsmål der er relateret til virksomheden.
2. Brug ALTID informationen ovenfor når du svarer.
3. Hvis du ikke kan hjælpe: "${business?.fallback_action || "Kontakt os venligst direkte."}" og giv kontaktinfo.
4. Ved klager: ${business?.complaint_action || "henvis til telefon eller email"}.
5. Svar ${business?.tone === "formel" ? "formelt og professionelt" : "venligt og uformelt"}.
6. Svar på ${business?.language || "dansk"}.
7. Hold svar korte — maks 3-4 sætninger.
8. Opfind aldrig information.`,
      },
      { role: "user", content: message },
    ],
  });

  const encoder = new TextEncoder();
  let answer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const token = chunk.choices?.[0]?.delta?.content;
          if (!token) {
            continue;
          }

          answer += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch {
        // Stream ends on error.
      } finally {
        // Save each user/bot exchange so the dashboard can render historical conversations.
        try {
          await supabase
            .from("conversations")
            .insert({
              business_id: stableBusinessId,
              messages: [
                { role: "user", content: message },
                { role: "assistant", content: answer },
                ...(stablePageUrl ? [{ role: "meta", page_url: stablePageUrl }] : []),
              ],
            });
        } catch {
          // Do not block chat replies if persistence fails.
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}