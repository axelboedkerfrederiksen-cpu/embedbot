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

function formatIngestError(error: unknown, url?: string) {
  if (!(error instanceof Error)) {
    return {
      message: "Ukendt serverfejl under generering af chatbotten.",
      status: 500,
    };
  }

  if (error.name === "AbortError" || error.message.includes("aborted")) {
    return {
      message: "Det tog for lang tid at hente hjemmesiden. Tjek at URL'en virker, og prøv igen.",
      status: 504,
    };
  }

  if (error.message.includes("Failed to fetch") || error.message.includes("fetch failed")) {
    return {
      message: `Kunne ikke hente hjemmesiden ${url ? `(${url})` : ""}. Tjek at URL'en er korrekt, offentlig tilgængelig og starter med https://.`,
      status: 502,
    };
  }

  if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo") || error.message.includes("DNS")) {
    return {
      message: `Domænet kunne ikke findes ${url ? `for ${url}` : ""}. Tjek stavning og om hjemmesiden faktisk er online.`,
      status: 502,
    };
  }

  return {
    message: error.message,
    status: 500,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { url, business_id } = await req.json();

    if (!url || !business_id) {
      return NextResponse.json({ success: false, error: "Mangler url eller business_id." }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.hostname || !["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { success: false, error: "URL'en skal starte med http:// eller https:// og pege på en gyldig hjemmeside." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "URL'en er ugyldig. Indtast en fuld adresse som fx https://example.com." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler API-nøgler eller database-konfiguration. Tilføj environment variables i Vercel." },
        { status: 500 }
      );
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
          { success: false, error: `Hjemmesiden svarede med fejl (${res.status}). Tjek at siden er offentlig og kan åbnes i browseren.` },
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
    const { message, status } = formatIngestError(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}