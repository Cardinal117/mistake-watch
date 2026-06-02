import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminConfig } from "./config";
import type { Database } from "./database.types";

export function createSupabaseAdminClient() {
  const { secretKey, url } = getSupabaseAdminConfig();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
