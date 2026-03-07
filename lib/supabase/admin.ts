import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient<Database>(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
