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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Du er en hjælpsom kundeserviceassistent. Svar KUN baseret på følgende information fra virksomheden. Hvis du ikke ved det, sig at kunden skal kontakte support.\n\n${context}`,
      },
      { role: "user", content: message },
    ],
  });

  return NextResponse.json({
    answer: completion.choices[0].message.content,
  });
}