import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
 * The auth session lives in cookies, so the client is wired to Next.js'
 * request cookie store via `getAll`/`setAll`. `cookies()` is async in this
 * version of Next.js, so this factory is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` was called from a Server Component, where setting
            // cookies is not allowed. This can be ignored when session
            // refresh happens in middleware which will be added later.
          }
        },
      },
    },
  );
}
