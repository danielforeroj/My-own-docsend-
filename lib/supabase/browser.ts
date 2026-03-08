"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/runtime";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  return createBrowserClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}
