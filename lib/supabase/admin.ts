import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/db/types";
import { getEnv, getOptionalEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function createAdminClientOrNull() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey);
}
