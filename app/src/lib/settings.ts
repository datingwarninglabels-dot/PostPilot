import "server-only";
import { cache } from "react";
import { getSupabaseAdmin } from "./supabase-admin";

export type Settings = {
  auto_draft_replies: boolean;
  updated_at: string;
};

const DEFAULTS: Settings = { auto_draft_replies: false, updated_at: new Date(0).toISOString() };

/** The single settings row. `cache()`d per request. Falls back to safe defaults
 *  (everything off) if the row somehow doesn't exist. */
export const getSettings = cache(async (): Promise<Settings> => {
  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .select("auto_draft_replies, updated_at")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("settings read failed, using defaults:", error);
    return DEFAULTS;
  }
  return (data as Settings | null) ?? DEFAULTS;
});

export async function setAutoDraftReplies(enabled: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("settings")
    .update({ auto_draft_replies: enabled, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
}
