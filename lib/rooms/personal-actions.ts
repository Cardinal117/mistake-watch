"use server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function openPersonalRoomAction(): Promise<
  { roomId: string; error?: never } | { error: string; roomId?: never }
> {
  if (process.env.PERSONAL_ROOMS_ENABLED !== "true") {
    return { error: "Personal rooms are not available yet." };
  }
  try {
    const client = await createSupabaseServerClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user || auth.user.is_anonymous !== false) {
      return { error: "Sign in to open your Personal room." };
    }
    // No client-supplied identity: the transaction derives auth.uid() and checks
    // the current profile, the private feature gate and lifetime uniqueness.
    const { data, error } = await client.rpc("open_personal_room");
    if (error) {
      return {
        error:
          error.code === "42501"
            ? error.message
            : "Your Personal room could not be opened. Please try again.",
      };
    }
    if (!data)
      return {
        error: "Your Personal room could not be opened. Please try again.",
      };
    return { roomId: data };
  } catch {
    return {
      error: "Your Personal room could not be opened. Please try again.",
    };
  }
}
