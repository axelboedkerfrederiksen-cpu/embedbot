import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CommerceError } from "../commerce/server.ts";
export async function session() {
  const store = await cookies();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => store.getAll(), setAll: list => list.forEach(c => store.set(c.name,c.value,c.options)) } });
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new CommerceError("Log ind for at fortsætte.",401);
  return { auth, user };
}
