import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_WIDGET_CONFIG = {
  primary_color: "#000000",
  secondary_color: "#000000",
  fab_color: "#000000",
  logo_url: "",
  font_choice: "sans-serif",
  name: "",
  welcome_message: "",
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isMissingColumnError(errorMessage: string, columnName: string) {
  const normalized = errorMessage.toLowerCase();
  return normalized.includes(`could not find the '${columnName.toLowerCase()}' column`) || normalized.includes(`column \"${columnName.toLowerCase()}\"`);
}

async function fetchBusinessWidgetConfig(businessId: string) {
  const selectVariants = [
    "name, primary_color, secondary_color, fab_color, chat_icon_color, logo_url, logo_data_url, font_choice, welcome_message",
    "name, primary_color, secondary_color, fab_color, logo_url, logo_data_url, font_choice, welcome_message",
    "name, primary_color, secondary_color, fab_color, logo_url, font_choice, welcome_message",
  ];

  let lastError: { message: string } | null = null;

  for (const fields of selectVariants) {
    const { data, error } = await supabase
      .from("businesses")
      .select(fields)
      .eq("id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      return { data, error: null };
    }

    const missingChatIconColor = isMissingColumnError(error.message, "chat_icon_color");
    const missingLogoDataUrl = isMissingColumnError(error.message, "logo_data_url");

    if (!missingChatIconColor && !missingLogoDataUrl) {
      return { data: null, error };
    }

    lastError = error;
  }

  return { data: null, error: lastError };
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const businessId = req.nextUrl.searchParams.get("id");
    if (!businessId) {
      return NextResponse.json(
        { error: "Mangler id parameter." },
        { status: 400 }
      );
    }

    const { data: business, error } = await fetchBusinessWidgetConfig(businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Widget config from Supabase:", business);

    return NextResponse.json({
      name: business?.name || DEFAULT_WIDGET_CONFIG.name,
      primary_color: business?.primary_color || DEFAULT_WIDGET_CONFIG.primary_color,
      secondary_color: business?.secondary_color || DEFAULT_WIDGET_CONFIG.secondary_color,
      fab_color: business?.fab_color || business?.chat_icon_color || DEFAULT_WIDGET_CONFIG.fab_color,
      logo_url: business?.logo_url || business?.logo_data_url || DEFAULT_WIDGET_CONFIG.logo_url,
      font_choice: business?.font_choice || DEFAULT_WIDGET_CONFIG.font_choice,
      welcome_message: business?.welcome_message || DEFAULT_WIDGET_CONFIG.welcome_message,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}