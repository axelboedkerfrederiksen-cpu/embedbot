import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase() || "";

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: "Indtast en gyldig e-mail." }, { status: 400 });
    }

    let page = 1;
    const perPage = 200;
    let exists = false;

    while (page <= 10) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

      if (error) {
        console.error("check-email listUsers error:", error);
        return NextResponse.json({ error: "Kunne ikke verificere mailen." }, { status: 500 });
      }

      const users = data.users || [];
      if (users.some((user) => (user.email || "").toLowerCase() === normalizedEmail)) {
        exists = true;
        break;
      }

      if (users.length < perPage) {
        break;
      }

      page += 1;
    }

    return NextResponse.json({ exists });
  } catch (error) {
    console.error("check-email error:", error);
    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}
