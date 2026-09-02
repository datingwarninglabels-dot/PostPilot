import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export type Platform = "facebook" | "instagram" | "tiktok";
export type PostStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "scheduled"
  | "submitted"
  | "published"
  | "failed";

export type Post = {
  id: string;
  platform: Platform;
  post_type: "product_announcement" | "general";
  source_product_description: string | null;
  content: string;
  media_urls: string[];
  status: PostStatus;
  connection_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  platform_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Drafts + everything not yet in a terminal published/rejected state, newest first —
 * the dashboard's main view. `submitted` (a TikTok post accepted for processing but
 * not confirmed live) stays here on purpose so it keeps prompting a check.
 */
export async function listActivePosts(): Promise<Post[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .not("status", "in", "(published,rejected)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Post | null;
}

export async function listPublishedPosts(limit = 50): Promise<Post[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .in("status", ["published", "submitted"])
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Post[];
}
