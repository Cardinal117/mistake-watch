import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey);
}
