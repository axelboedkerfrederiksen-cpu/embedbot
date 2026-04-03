import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_WIDGET_CONFIG = {
  primary_color: "#ffffff",
  secondary_color: "#f6f3ed",
  fab_color: "#ffffff",
  logo_url: "",
  font_choice: "Poppins",
  name: "",
  welcome_message: "",
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isMissingColumnError(errorMessage: string, columnName: string) {
  const normalized = errorMessage.toLowerCase();
  const lowerColumn = columnName.toLowerCase();
  return (
    normalized.includes(`could not find the '${lowerColumn}' column`) ||
    normalized.includes(`column \"${lowerColumn}\"`) ||
    normalized.includes(`column ${lowerColumn}`) ||
    normalized.includes(`column businesses.${lowerColumn}`)
  );
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
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

    const { data: businessRaw, error } = await fetchBusinessWidgetConfig(businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const business = asRecord(businessRaw);
    console.log("Widget config from Supabase:", businessRaw);

    const name = asString(business?.name);
    const primaryColor = asString(business?.primary_color);
    const secondaryColor = asString(business?.secondary_color);
    const fabColor = asString(business?.fab_color);
    const chatIconColor = asString(business?.chat_icon_color);
    const logoUrl = asString(business?.logo_url);
    const logoDataUrl = asString(business?.logo_data_url);
    const fontChoice = asString(business?.font_choice);
    const welcomeMessage = asString(business?.welcome_message);

    return NextResponse.json({
      name: name || DEFAULT_WIDGET_CONFIG.name,
      primary_color: primaryColor || DEFAULT_WIDGET_CONFIG.primary_color,
      secondary_color: secondaryColor || DEFAULT_WIDGET_CONFIG.secondary_color,
      fab_color: fabColor || chatIconColor || DEFAULT_WIDGET_CONFIG.fab_color,
      logo_url: logoUrl || logoDataUrl || DEFAULT_WIDGET_CONFIG.logo_url,
      font_choice: fontChoice || DEFAULT_WIDGET_CONFIG.font_choice,
      welcome_message: welcomeMessage || DEFAULT_WIDGET_CONFIG.welcome_message,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}