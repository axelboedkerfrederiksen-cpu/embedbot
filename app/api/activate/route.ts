import { NextRequest, NextResponse } from "next/server";
import { checkCsrfSafety } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-auth";
import { activateBusinessAndSendEmail } from "@/lib/business-activation";

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = await checkCsrfSafety(req, true);
    if (!csrfCheck.safe) {
      return NextResponse.json({ success: false, error: csrfCheck.error }, { status: 403 });
    }

    const authResult = await verifyAdminSession(req);
    if ("error" in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const businessId = typeof body.business_id === "string" ? body.business_id.trim() : "";
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    const pilotEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = await activateBusinessAndSendEmail(businessId, {
      accessSource: "manual_pilot",
      subscriptionStatus: "trialing",
      paymentStatus: "unpaid",
      currentPeriodEnd: pilotEndsAt,
      plan: "starter",
    });

    return NextResponse.json(
      { ...result, pilotEndsAt: result.success ? pilotEndsAt : undefined },
      { status: result.status || (result.success ? 200 : 500) }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "Ukendt serverfejl." }, { status: 500 });
  }
}
