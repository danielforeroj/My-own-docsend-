import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/runtime";

function createMockQueryBuilder() {
  const result = Promise.resolve({ data: [], error: null, count: 0 });
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return result.then.bind(result);
      if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve({ data: null, error: null });
      return () => new Proxy({}, handler);
    }
  };
  return new Proxy({}, handler);
}

function createMockSupabaseClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null })
    },
    from: () => createMockQueryBuilder(),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null })
      })
    }
  } as unknown as ReturnType<typeof createServerClient<Database>>;
}

export async function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockSupabaseClient();
  }

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
