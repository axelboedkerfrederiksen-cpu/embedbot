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
  try {
    const { url, business_id } = await req.json();

    if (!url || !business_id) {
      return NextResponse.json({ success: false, error: "Mangler url eller business_id." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: "Serveren mangler environment variables." }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let html = "";

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EmbedBot/1.0)",
        },
      });

      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Kunne ikke hente hjemmesiden (${res.status}).` },
          { status: 502 }
        );
      }

      html = await res.text();
    } finally {
      clearTimeout(timeoutId);
    }

    const $ = cheerio.load(html);
    $("script, style, nav, footer").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    if (!text) {
      return NextResponse.json({ success: false, error: "Kunne ikke udtrække tekst fra hjemmesiden." }, { status: 422 });
    }

    const chunks = chunkText(text).filter((chunk) => chunk.trim().length > 0);

    if (chunks.length === 0) {
      return NextResponse.json({ success: false, error: "Ingen tekst fundet at indeksere." }, { status: 422 });
    }

    for (const chunk of chunks) {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingRes.data[0].embedding;
      const { error: insertError } = await supabase.from("documents").insert({
        business_id,
        content: chunk,
        embedding,
      });

      if (insertError) {
        throw new Error(`Kunne ikke gemme embeddings: ${insertError.message}`);
      }
    }

    return NextResponse.json({ success: true, chunks: chunks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukendt serverfejl.";
    const status = message.includes("aborted") ? 504 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}