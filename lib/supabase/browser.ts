"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/db/types";

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function isBrowserSupabaseConfigured() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return Boolean(url && anonKey);
}

export function isBrowserDemoMode() {
  const value = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();

  if (!url || !anonKey) {
    throw new Error("Supabase public env vars are missing in the browser runtime.");
  }

  return createBrowserClient<Database>(url, anonKey);
}

export function createClientOrNull() {
  const { url, anonKey } = getPublicSupabaseEnv();

  if (!url || !anonKey) return null;

  return createBrowserClient<Database>(url, anonKey);
}

export function createClientOrNull() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) return null;

  return createBrowserClient<Database>(url, anonKey);
}
