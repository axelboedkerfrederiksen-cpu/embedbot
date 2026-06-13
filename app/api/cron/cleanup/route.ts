import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Cron endpoint to clean up expired conversations based on retention policy
 * 
 * Call this regularly (e.g., daily) using:
 * - Vercel Cron (if deployed on Vercel)
 * - External cron service
 * - GitHub Actions
 * 
 * Requires CRON_SECRET environment variable for security
 */
export async function POST(req: NextRequest) {
  try {
    // Verify request is authorized (prevent unauthorized access)
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

    // Call RPC function to cleanup expired conversations
    const { data, error } = await supabase.rpc("cleanup_expired_conversations");

    if (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json(
        { error: "Cleanup failed", details: error.message },
        { status: 500 }
      );
    }

    const deletedCount = data?.[0]?.deleted_count || 0;

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${deletedCount} conversations marked as deleted.`,
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
