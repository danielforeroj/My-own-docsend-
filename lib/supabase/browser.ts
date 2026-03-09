"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";
import { getEnv, getOptionalEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function createClientOrNull() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) return null;

  return createBrowserClient<Database>(url, anonKey);
}
