import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const { message, business_id } = await req.json();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: message,
  });
  const queryEmbedding = embeddingRes.data[0].embedding;

  const { data: docs } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_business_id: business_id,
    match_count: 5,
  });

  const context = docs?.map((d: any) => d.content).join("\n\n");

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
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Du er en kundeserviceassistent for ${business?.name || "denne virksomhed"}.

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

  return NextResponse.json({
    answer: completion.choices[0].message.content,
  });
}