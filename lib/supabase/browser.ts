"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}
