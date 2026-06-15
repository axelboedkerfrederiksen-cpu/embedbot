import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminEmailOrThrow } from "@/lib/admin-email";

function getAdminPasswordOrThrow() {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) {
    throw new Error("Serveren mangler ADMIN_PASSWORD.");
  }

  return adminPassword;
}

export async function verifyAdminSession(req: Request) {
  let adminEmail: string;
  let adminPassword: string;
  try {
    adminEmail = getAdminEmailOrThrow();
    adminPassword = getAdminPasswordOrThrow();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Serveren mangler ADMIN_EMAIL.",
      status: 500 as const,
    };
  }

  const providedPassword = req.headers.get("x-admin-password")?.trim();
  if (!providedPassword) {
    return { error: "Mangler admin-kode.", status: 401 as const };
  }

  if (providedPassword !== adminPassword) {
    return { error: "Forkert admin-kode.", status: 403 as const };
  }

  const providedEmail = req.headers.get("x-admin-email")?.trim().toLowerCase();
  if (providedEmail && providedEmail === adminEmail) {
    return { user: { email: adminEmail } };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Ikke autoriseret.", status: 401 as const };
  }

  const signedInEmail = user.email?.trim().toLowerCase();
  if (!signedInEmail || signedInEmail !== adminEmail) {
    return { error: "Ikke autoriseret.", status: 403 as const };
  }

  return { supabase, user };
}