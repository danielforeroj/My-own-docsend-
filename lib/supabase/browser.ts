"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/runtime";

function createMockBrowserClient() {
  return {
    auth: {
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: "Supabase is not configured." } })
    },
    storage: {
      from: () => ({
        uploadToSignedUrl: async () => ({ error: { message: "Supabase is not configured." } })
      })
    }
  } as any;
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockBrowserClient();
  }

  return createBrowserClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}
