import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function verifyAdminSession() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return { error: "Serveren mangler ADMIN_EMAIL.", status: 500 as const };
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