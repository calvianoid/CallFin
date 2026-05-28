import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Server-side Supabase client. Reads session from Next.js cookies so RLS
 * applies the right user. Use inside Server Components, Route Handlers,
 * and Server Actions.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Setting cookies outside of a route handler context — safe to ignore.
        }
      },
    },
  });
}
