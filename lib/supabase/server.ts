import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Ignored in Server Components where cookie writes are blocked.
        }
      }
    }
  });
}
