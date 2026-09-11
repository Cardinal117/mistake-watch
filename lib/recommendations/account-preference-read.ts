import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const PAGE_SIZE = 500;

/** Never interpret a truncated account preference list as a set of unlikes. */
export async function readAccountPreferences(
  client: SupabaseClient<Database>,
  accountUserId: string,
) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("media_preferences")
      .select("media_id,preference_state,source_type,source_event_at")
      .eq("user_id", accountUserId)
      .order("source_type", { ascending: true })
      .order("media_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
