import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export type Platform = "facebook" | "instagram" | "tiktok";
export type PostStatus = "draft" | "approved" | "rejected" | "scheduled" | "published" | "failed";

export type Post = {
  id: string;
  platform: Platform;
  post_type: "product_announcement" | "general";
  source_product_description: string | null;
  content: string;
  media_urls: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  platform_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

/** Drafts + everything not yet published, newest first — the dashboard's main view. */
export async function listActivePosts(): Promise<Post[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .neq("status", "published")
    .neq("status", "rejected")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Post[];
}

export async function listPublishedPosts(limit = 20): Promise<Post[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Post[];
}
