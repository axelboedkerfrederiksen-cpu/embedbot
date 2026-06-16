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

    const { business_id } = await req.json();

    if (!business_id || typeof business_id !== "string") {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    const activationResult = await activateBusinessAndSendEmail(business_id);
    if (!activationResult.success) {
      return NextResponse.json(
        { success: false, error: activationResult.error || "Aktivering fejlede." },
        { status: activationResult.status || 500 }
      );
    }

    return NextResponse.json({ success: true, alreadyActivated: Boolean(activationResult.alreadyActivated) });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "Ukendt serverfejl." }, { status: 500 });
  }
}
