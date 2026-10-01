import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Cron endpoint to clean up expired conversations based on retention policy
 * Requires CRON_SECRET environment variable for security.
 */
async function runCleanup(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET?.trim();

    if (!expectedToken) {
      console.warn("CRON_SECRET not configured - rejecting cleanup request");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 503 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error("Cleanup job is missing Supabase server credentials");
      return NextResponse.json(
        { error: "Cleanup job not configured" },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("cleanup_expired_conversations");

    if (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json(
        { error: "Cleanup failed" },
        { status: 500 }
      );
    }

    const deletedCount = Number(data?.[0]?.deleted_count ?? 0);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${deletedCount} conversations permanently deleted.`,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cleanup job error:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Unknown server error" },
      { status: 500 }
    );
  }
}

// Vercel Cron invokes configured paths with GET requests.
export async function GET(req: NextRequest) {
  return runCleanup(req);
}

// Keep POST available for authenticated manual runs during operations.
export async function POST(req: NextRequest) {
  return runCleanup(req);
}
