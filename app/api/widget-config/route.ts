import { APPEARANCE_DEFAULTS, validLogoSource } from "@/lib/widget-appearance";
import { publicWorkspaceConfig } from "@/lib/workspace/public-config";
import { validId } from "@/lib/commerce/security";
import { privacyUrl } from "@/lib/compliance/validation";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_WIDGET_CONFIG: Record<string, string> = {
  ...APPEARANCE_DEFAULTS,
  fab_color: APPEARANCE_DEFAULTS.chat_icon_color,
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
  let fields = "name,primary_color,secondary_color,fab_color,chat_icon_color,logo_url,logo_data_url,font_choice,welcome_message,chat_outline_enabled,chat_outline_color,chat_outline_width,chat_outline_opacity,widget_opacity".split(",");
  for (let attempt = 0; attempt < 16; attempt++) {
    const { data, error } = await supabase.from("businesses").select(fields.join(",")).eq("id", businessId)
      .or("is_deleted.eq.false,is_deleted.is.null").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!error) return { data, error: null };
    const missing = fields.find(field => isMissingColumnError(error.message, field));
    if (!missing) return { data: null, error };
    fields = fields.filter(field => field !== missing);
  }
  return { data: null, error: { message: "Widget schema unavailable" } };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
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
    if (!validId(businessId)) {
      return NextResponse.json(
        { error: "Mangler id parameter." },
        { status: 400 }
      );
    }

    const { data: businessRaw, error } = await fetchBusinessWidgetConfig(businessId);

    if (error) {
      return NextResponse.json({ error: "Indstillingerne kunne ikke hentes." }, { status: 503 });
    }

    const business = asRecord(businessRaw);
    if(!business)return NextResponse.json({error:"Chatbotten blev ikke fundet."},{status:404});

    const name = asString(business?.name);
    const primaryColor = asString(business?.primary_color);
    const secondaryColor = asString(business?.secondary_color);
    const fabColor = asString(business?.fab_color);
    const chatIconColor = asString(business?.chat_icon_color);
    const logoUrl = asString(business?.logo_url);
    const logoDataUrl = asString(business?.logo_data_url);
    const fontChoice = asString(business?.font_choice);
    const welcomeMessage = asString(business?.welcome_message);
    const chatOutlineEnabled = asString(business?.chat_outline_enabled);
    const chatOutlineColor = asString(business?.chat_outline_color);
    const chatOutlineWidth = asString(business?.chat_outline_width);
    const chatOutlineOpacity = asString(business?.chat_outline_opacity);
    const widgetOpacity = asString(business?.widget_opacity);

    const { data: privacy } = await supabase.from("business_privacy_settings").select("customer_privacy_url").eq("business_id", businessId).maybeSingle();
    let customerPrivacyUrl: string | null = null;
    try { customerPrivacyUrl = privacyUrl(privacy?.customer_privacy_url ?? null); } catch { /* Fail safely if an old invalid value exists. */ }
    const {data:workspace}=await supabase.from("workspace_settings").select("state").eq("business_id",businessId).maybeSingle();
    const workspaceConfig=publicWorkspaceConfig(workspace?.state||null,req.nextUrl.searchParams.get("path")||"/");
    return NextResponse.json({
      ...workspaceConfig,
      customer_privacy_url: customerPrivacyUrl,
      name: name || DEFAULT_WIDGET_CONFIG.name,
      primary_color: primaryColor || DEFAULT_WIDGET_CONFIG.primary_color,
      secondary_color: secondaryColor || DEFAULT_WIDGET_CONFIG.secondary_color,
      fab_color: chatIconColor || fabColor || DEFAULT_WIDGET_CONFIG.fab_color,
      logo_url: [logoUrl, logoDataUrl].find(value => value && validLogoSource(value)) || DEFAULT_WIDGET_CONFIG.logo_url,
      font_choice: fontChoice || DEFAULT_WIDGET_CONFIG.font_choice,
      welcome_message: welcomeMessage || DEFAULT_WIDGET_CONFIG.welcome_message,
      chat_outline_enabled: chatOutlineEnabled || DEFAULT_WIDGET_CONFIG.chat_outline_enabled,
      chat_outline_color: chatOutlineColor || DEFAULT_WIDGET_CONFIG.chat_outline_color,
      chat_outline_width: chatOutlineWidth || DEFAULT_WIDGET_CONFIG.chat_outline_width,
      chat_outline_opacity: chatOutlineOpacity || DEFAULT_WIDGET_CONFIG.chat_outline_opacity,
      widget_opacity: widgetOpacity || DEFAULT_WIDGET_CONFIG.widget_opacity,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: "Indstillingerne kunne ikke hentes." }, { status: 503 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}
