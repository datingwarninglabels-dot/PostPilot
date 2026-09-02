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
export async function listActivePosts(opts?: { connectionId?: string }): Promise<Post[]> {
  let query = getSupabaseAdmin()
    .from("posts")
    .select("*")
    .not("status", "in", "(published,rejected)");
  if (opts?.connectionId) query = query.eq("connection_id", opts.connectionId);

  const { data, error } = await query.order("created_at", { ascending: false });
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

export type SentPost = Post & { account_name: string | null };

/** The "what went out" feed — published + TikTok-submitted posts, newest first,
 *  with the target account name resolved for display. */
export async function listSentPosts(
  limit = 60,
  opts?: { connectionId?: string }
): Promise<SentPost[]> {
  let query = getSupabaseAdmin()
    .from("posts")
    .select("*, platform_connections(account_name)")
    .in("status", ["published", "submitted"]);
  if (opts?.connectionId) query = query.eq("connection_id", opts.connectionId);

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as (Post & { platform_connections: { account_name: string } | null })[]).map(
    ({ platform_connections, ...post }) => ({
      ...post,
      account_name: platform_connections?.account_name ?? null,
    })
  );
}

/** Best-effort public URL for a post that went out. Only Facebook exposes one from
 *  the id we store; Instagram media ids and TikTok publish ids don't map to a URL
 *  without another API call. */
export function platformPostUrl(post: Pick<Post, "platform" | "platform_post_id">): string | null {
  if (!post.platform_post_id) return null;
  if (post.platform === "facebook") {
    return `https://www.facebook.com/${post.platform_post_id}`;
  }
  return null;
}
