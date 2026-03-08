import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/runtime";

export function createAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  return createClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
