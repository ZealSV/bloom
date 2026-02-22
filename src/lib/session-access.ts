import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export async function userOwnsSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}
