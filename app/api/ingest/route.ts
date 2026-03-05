import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as cheerio from "cheerio";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function chunkText(text: string, size = 500): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  const { url, business_id } = await req.json();

  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });

    const embedding = embeddingRes.data[0].embedding;

    await supabase.from("documents").insert({
      business_id,
      content: chunk,
      embedding,
    });
  }

  return NextResponse.json({ success: true, chunks: chunks.length });
}