import { chatReference } from "@/lib/compliance/chat-reference";
import { chatProgressResponse, type ChatStage } from "@/lib/chat-progress";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { createHash } from "node:crypto";
import { buildChatSystemPrompt } from "@/lib/chat-system-prompt";
import { supportKey } from "@/lib/commerce/security";
import { mailConfigured } from "@/lib/commerce/mail";
import { cachedProducts } from "@/lib/commerce";
import { integration } from "@/lib/commerce/server";
import { safeUrl } from "@/lib/commerce/types";
import { refreshProductPages } from "@/lib/website-crawl";
import { classifyCommerce, commerceCopy, orderIntent, supportIntent, productComplaint, heuristicLanguage, safeHistory, redact } from "@/lib/commerce/chat";
import { isBusinessSubscriptionActive } from "@/lib/subscription";
import { getAnswerLimit, getPlan } from "@/lib/plans";
import { getPreviewTokenSecret, verifyPreviewToken } from "@/lib/preview-access";

const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Sanitize output to prevent prompt injection in system prompt
 */
function sanitizeOutput(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/\n/g, " ")
    .substring(0, 500);
}

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

function isValidPreviewRequest(
  req: NextRequest,
  businessId: string,
  pageUrl: string,
  previewToken: string,
): boolean {
  const secret = getPreviewTokenSecret();
  if (!secret || !previewToken) return false;

  const origin = req.headers.get("origin");
  if (!origin || origin !== req.nextUrl.origin) return false;

  try {
    const parsedPageUrl = new URL(pageUrl);
    if (parsedPageUrl.origin !== req.nextUrl.origin || parsedPageUrl.pathname !== `/preview/${businessId}`) {
      return false;
    }
  } catch {
    return false;
  }

  return verifyPreviewToken(previewToken, businessId, secret);
}

function hashClientIp(ip: string, businessId: string) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_KEY || "embedbot";
  return createHash("sha256").update(`${salt}:${businessId}:${ip}`).digest("hex");
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function isRateLimited(ip: string, businessId: string) {
  const ipHash = hashClientIp(ip, businessId);
  const { data, error } = await supabase.rpc("enforce_chat_rate_limit", {
    p_ip_hash: ipHash,
    p_limit: RATE_LIMIT_MAX,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (error) {
    return true; // Fail closed: verification endpoints must retain rate limiting.
  }

  return data === true;
}

type AnswerAllowance = {
  allowed: boolean;
  used: number;
  limit: number;
};

function getCurrentUtcMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function consumeAnswerAllowance(
  businessId: string,
  planValue: unknown,
  answerLimitOverride?: unknown
): Promise<AnswerAllowance> {
  const plan = getPlan(planValue);
  const answerLimit = getAnswerLimit(plan.slug, answerLimitOverride);
  const { data, error } = await supabase.rpc("consume_ai_answer", {
    p_business_id: businessId,
    p_limit: answerLimit,
  });

  if (!error) {
    const result = Array.isArray(data) ? data[0] : data;
    if (result && typeof result === "object") {
      const row = result as Record<string, unknown>;
      return {
        allowed: row.allowed === true,
        used: typeof row.used === "number" ? row.used : 0,
        limit: typeof row.limit_value === "number" ? row.limit_value : answerLimit,
      };
    }
  }

  // Safe fallback while the pricing migration is being rolled out.
  const { count, error: countError } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", getCurrentUtcMonthStart());

  if (countError) {
    console.error("answer_allowance_verification_failed");
    return { allowed: false, used: answerLimit, limit: answerLimit };
  }

  const used = count || 0;
  return { allowed: used < answerLimit, used, limit: answerLimit };
}

export async function POST(req: NextRequest) {
  const wantsProgress = await req.clone().json().then(body => body.stream_events === true).catch(() => false);
  if (wantsProgress) return chatProgressResponse((status,reference) => handleChat(req, status,reference));
  return handleChat(req);
}

async function handleChat(req: NextRequest, status: (stage: ChatStage) => void = () => {}, reference: (id:string,token:string)=>void = ()=>{}) {
  try {
    const clientIp = getClientIp(req);
    const { message, business_id, page_url, preview_token, history, order_lookup, commerce_language, session } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";
    const stablePageUrl = typeof page_url === "string" && page_url.trim() ? page_url.trim() : "";
    const stablePreviewToken = typeof preview_token === "string" ? preview_token.trim() : "";

    if (!stableBusinessId) {
      return NextResponse.json(
        { error: "Mangler business_id." },
        { status: 400 }
      );
    }

    if (await isRateLimited(clientIp, stableBusinessId)) {
      return NextResponse.json(
        { error: "Rate limit ramt: maks 50 beskeder pr. dag." },
        { status: 429 }
      );
    }

    // Validate message input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Mangler besked." },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json(
        { error: "Besked kan ikke være tom." },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 10000) {
      return NextResponse.json(
        { error: "Besked er for lang (max 10000 tegn)." },
        { status: 400 }
      );
    }

    // Verify business exists and is not deleted
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", stableBusinessId)
      .or("is_deleted.eq.false,is_deleted.is.null")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (businessError || !business) {
      // Log security event but don't expose details to user
      console.warn("chat_business_not_found");
      return NextResponse.json(
        { error: "Virksomheden blev ikke fundet." },
        { status: 404 }
      );
    }

    const previewAccess = isValidPreviewRequest(req, stableBusinessId, stablePageUrl, stablePreviewToken);
    if (!isBusinessSubscriptionActive(business) && !previewAccess) {
      return NextResponse.json(
        { error: "Abonnement kræves for at bruge chatbotten." },
        { status: 402 }
      );
    }

    const plan = getPlan(business.plan);
    const allowance = await consumeAnswerAllowance(
      stableBusinessId,
      plan.slug,
      business.ai_answer_limit_override
    );
    if (!allowance.allowed) {
      return NextResponse.json(
        {
          error: `${plan.name}-planen har brugt månedens ${new Intl.NumberFormat("da-DK").format(allowance.limit)} AI-svar. Grænsen nulstilles ved næste månedsskifte.`,
          code: "monthly_answer_limit_reached",
          used: allowance.used,
          limit: allowance.limit,
        },
        { status: 429 }
      );
    }

  const companyName = typeof business?.name === "string" && business.name.trim()
    ? business.name.trim()
    : "denne virksomhed";

  const [connected, supportSettings, websiteSource] = await Promise.all([
    integration(supabase, stableBusinessId),
    supabase.from("commerce_settings").select("notification_email").eq("business_id", stableBusinessId).maybeSingle(),
    supabase.from("website_sources").select("content_text,imported_at,source_kind,source_name").eq("business_id", stableBusinessId).maybeSingle(),
  ]);
  let secureStorage = false;
  try { supportKey(); secureStorage = true; } catch { /* Report capability only; never expose configuration. */ }
  const capabilities = {
    products: Boolean(connected?.adapter.productsEnabled),
    orders: Boolean(connected?.adapter.ordersEnabled && mailConfigured()),
    supportCases: secureStorage && !supportSettings.error,
    supportEmail: secureStorage && !supportSettings.error && Boolean(supportSettings.data?.notification_email) && mailConfigured(),
  };
  const adapter = connected?.adapter;
  if (productComplaint(trimmedMessage)) {
    return NextResponse.json({ kind: "support", text: "Det beklager jeg. Fortæl gerne, hvilket produkt du leder efter, så prøver jeg igen. Du kan også oprette en supportsag, hvis du har brug for hjælp fra webshoppen.", offerSupport: capabilities.supportCases }, { headers: { "Cache-Control": "no-store" } });
  }
  if (supportIntent(trimmedMessage, history)) {
    return NextResponse.json({ kind: "support", text: capabilities.supportCases ? "Jeg kan hjælpe dig med at oprette en henvendelse. Udfyld formularen, gennemse opsummeringen og bekræft, at den skal sendes." : `Supportsager er ikke aktiveret her endnu. Kontakt virksomheden direkte${business.support_email ? ` på ${sanitizeOutput(business.support_email)}` : " via dens hjemmeside"}.`, needsSupportInput: capabilities.supportCases }, { headers: { "Cache-Control": "no-store" } });
  }
  const structuredOrder = order_lookup !== undefined;
  const obviousOrder = structuredOrder || orderIntent(trimmedMessage);
  let routing: Awaited<ReturnType<typeof classifyCommerce>> = { intent: obviousOrder ? "order" : "general", language: typeof commerce_language === "string" && /^[a-z]{2}$/.test(commerce_language) ? commerce_language : heuristicLanguage(trimmedMessage), search: null };
  if (!obviousOrder) {
    try { routing = await classifyCommerce(openai, trimmedMessage, history); }
    catch { /* Continue using the existing chat when classification is unavailable. */ }
  }
  if (routing.intent === "support") {
    return NextResponse.json({ kind: "support", text: capabilities.supportCases ? "Jeg kan hjælpe dig med at sende en henvendelse til virksomheden. Udfyld kontaktmail og besked, gennemse opsummeringen og vælg ‘Send henvendelse’." : `Henvendelser via chatten er ikke aktiveret her endnu. Kontakt virksomheden direkte${business.support_email ? ` på ${sanitizeOutput(business.support_email)}` : " via dens hjemmeside"}.`, needsSupportInput: capabilities.supportCases }, { headers: { "Cache-Control": "no-store" } });
  }
  const commerceResponse = (payload: Record<string, unknown>) => NextResponse.json(payload, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  // Website-only bots answer product questions using their imported context.
  // Only connected shops can perform live product lookups; orders always stay
  // in the separate verification flow, even without an integration.
  if (routing.intent === "order" || (routing.intent === "product" && capabilities.products)) {
    const copy = await commerceCopy(openai, routing.language);
    const contact = { email: typeof business.support_email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business.support_email) ? business.support_email : null, url: safeUrl(business.website_url) };
    if (routing.intent === "order") {
      // This branch never embeds, sends to the LLM, logs or persists order data.
      if (!capabilities.orders) return commerceResponse({ kind: "order", text: copy.orderUnavailable, copy, contact, offerSupport: false });
      if (!structuredOrder) return commerceResponse({ kind: "order", text: copy.orderPrompt, needsOrderInput: true, language: routing.language, copy, contact, offerSupport: false });
      // No order identifiers or model tool can bypass the OTP route. Legacy
      // order_lookup requests receive the same verification form, never data.
      return commerceResponse({ kind: "order", text: copy.orderPrompt, needsOrderInput: true, language: routing.language, copy, contact, offerSupport: false });
    }
    if (adapter?.productsEnabled && routing.search) {
      if (!routing.search.query && routing.search.variant) return commerceResponse({ kind: "products", text: "Hvilket produkt vil du tjekke varianten for? Angiv gerne produktnavnet.", products: [], copy, contact, offerSupport: false });
      try {
        status("searching");
        const result = await cachedProducts(stableBusinessId, connected!.revision, adapter, routing.search);
        return commerceResponse({ kind: "products", text: result.products.length ? copy.productsFound : copy.noProducts, ...result, moreText: copy.moreProducts, copy, contact, offerSupport: false });
      } catch { /* Return an explicit unavailable response without stale claims. */ }
    }
    return commerceResponse({ kind: "products", text: copy.productUnavailable, products: [], copy, contact, offerSupport: false });
  }

  if (routing.intent === "product" && websiteSource.data?.source_kind === "url") status("searching");
  const freshProductContext = routing.intent === "product" && websiteSource.data?.source_kind === "url"
    ? await refreshProductPages(websiteSource.data.content_text, routing.search?.query || trimmedMessage, undefined, websiteSource.data.source_name).catch(() => "")
    : "";

  // Generate embeddings with error handling
  let queryEmbedding: number[] = [];
  try {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: redact(trimmedMessage),
    });
    queryEmbedding = embeddingRes.data[0].embedding;
  } catch {
    console.error("Embedding generation failed");
    // Continue without context - graceful degradation
  }

  // Try to fetch context documents
  let docs: Array<{ content?: string }> = [];
  if (queryEmbedding.length > 0) {
    try {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_business_id: stableBusinessId,
        match_count: 5,
      });

      if (!error && data) {
        docs = data;
      }
    } catch {
      console.error("document_matching_failed");
      // Continue without context
    }
  }

  const context = (docs as Array<{ content?: string }> | null | undefined)
    ?.map((doc) => (typeof doc.content === "string" ? doc.content : ""))
    .filter(Boolean)
    .join("\n\n");

  const businessInfo = `
VIRKSOMHED: ${sanitizeOutput(business?.name || "")}
HJEMMESIDE: ${sanitizeOutput(business?.website_url || "")}
BRANCHE: ${sanitizeOutput(business?.industry || "")}
BESKRIVELSE: ${sanitizeOutput(business?.description || "")}

KONTAKT:
- Email: ${sanitizeOutput(business?.support_email || "")}
- Telefon: ${sanitizeOutput(business?.phone || "")}
- Adresse: ${sanitizeOutput(business?.address || "")}, ${sanitizeOutput(business?.city || "")}

ÅBNINGSTIDER:
- Mandag-fredag: ${sanitizeOutput(business?.hours_weekday || "")}
- Lørdag: ${sanitizeOutput(business?.hours_saturday || "")}
- Søndag: ${sanitizeOutput(business?.hours_sunday || "")}

SUPPORT:
- Svartid: ${sanitizeOutput(business?.response_time || "")}
- Hvis botten ikke kan hjælpe: ${sanitizeOutput(business?.fallback_action || "")}
- Ved klager: ${sanitizeOutput(business?.complaint_action || "")}

PRODUKTER/SERVICES: ${sanitizeOutput(business?.products_services || "")}
LEVERINGSTID: ${sanitizeOutput(business?.delivery_time || "")}
RETURPOLITIK: ${sanitizeOutput(business?.return_policy || "")}
BETALINGSMETODER: ${sanitizeOutput(business?.payment_methods || "")}

FAQ:
${sanitizeOutput(business?.faq || "")}

VALGFRIT:
- CVR: ${sanitizeOutput(business?.cvr || "")}
- Sociale medier: ${sanitizeOutput(business?.social_media || "")}
- Tilbud: ${sanitizeOutput(business?.current_offers || "")}
- Garanti: ${sanitizeOutput(business?.warranty || "")}

EKSTRA INSTRUKSER FRA VIRKSOMHEDEN:
${sanitizeOutput(business?.custom_instructions || "Ingen")}
`;

  status("details");
  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    reasoning_effort: "none",
    stream: true,
    max_completion_tokens: 500,
    messages: [
      {
        role: "system",
        content: buildChatSystemPrompt({
          companyName,
          businessInfo,
          websiteContext: [context, websiteSource.data?.content_text ? `Importeret hjemmeside/HTML (${websiteSource.data.imported_at}, ikke live data):\n${websiteSource.data.content_text}` : ""].filter(Boolean).join("\n\n") || "Ingen relevant hjemmesidekontekst fundet.",
          publicProductContext: freshProductContext,
          language: sanitizeOutput(business?.language || "dansk"),
          formal: business?.tone === "formel",
          capabilities,
        }),
      },
      ...safeHistory(history),
      { role: "user", content: trimmedMessage },
    ],
  });

  const encoder = new TextEncoder();
  let answer = "";
  let streamError = false;

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
        streamError = true;
        console.error("Chat stream failed");
        // Send error message to user
        const errorMessage = "\n\nBeklager, der opstod et problem med assistenten. Prøv igen om et øjeblik.";
        controller.enqueue(encoder.encode(errorMessage));
      } finally {
        // Save conversation if we got some response
        if (answer || streamError) {
          try {
            const {data:saved,error:saveError} = await supabase
              .from("conversations")
              .insert({
                business_id: stableBusinessId,
                messages: [
                  { role: "user", content: trimmedMessage },
                  { 
                    role: "assistant", 
                    content: answer || "(Teknisk fejl - besked blev ikke gemmet)" 
                  },
                  ...(stablePageUrl ? [{ role: "meta", page_url: stablePageUrl }] : []),
                ],
              }).select("id").single();
            if (!saveError && saved?.id) {
              try { const token=chatReference(saved.id,stableBusinessId,session);if(token)reference(saved.id,token); } catch { /* Optional reference cannot interrupt an answer. */ }
            }
          } catch {
            // Do not block chat replies if persistence fails
            console.error("conversation_save_failed");
          }
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
} catch (error) {
  console.error("Chat endpoint failed");
  
  // Gracefully handle OpenAI service errors
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return NextResponse.json(
        { error: "OpenAI service is overloaded. Prøv igen om et øjeblik." },
        { status: 503 }
      );
    }
    if (error.status === 401 || error.status === 403) {
      console.error("OpenAI authentication failed");
      return NextResponse.json(
        { error: "Assistenten er midlertidigt utilgængelig." },
        { status: 503 }
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: "Assistenten er midlertidigt utilgængelig. Prøv igen senere." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: "En uventet fejl opstod." },
    { status: 500 }
  );
}
}
