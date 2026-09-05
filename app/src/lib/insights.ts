import "server-only";
import { GRAPH_VERSION } from "./meta";
import {
  getDecryptedConnection,
  getDecryptedConnectionById,
  type DecryptedConnection,
} from "./platform-connections";
import type { Post, SentPost } from "./posts";

/**
 * Live engagement numbers for a published post, pulled from the platform each
 * time /history renders. Basic counts (likes/reactions, comments, shares) use
 * scopes the app already has; reach/impressions "insights" need extra scopes it
 * doesn't. On a permission error we surface `missingScope` rather than hiding it.
 */

export type Engagement = {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
};

export type EngagementResult =
  | { ok: true; engagement: Engagement; missingScope?: string }
  | { ok: false; error: string; missingScope?: string };

const TIMEOUT_MS = 8000;
const MAX_POSTS = 18;

export async function fetchPostEngagement(
  connection: DecryptedConnection,
  post: Pick<Post, "platform" | "platform_post_id">
): Promise<EngagementResult> {
  if (!post.platform_post_id) return { ok: false, error: "No platform post ID stored for this post." };
  try {
    if (post.platform === "facebook") return await facebook(connection, post.platform_post_id);
    if (post.platform === "instagram") return await instagram(connection, post.platform_post_id);
    if (post.platform === "tiktok") return await tiktok(connection, post.platform_post_id);
    return { ok: false, error: `Engagement isn't supported for ${post.platform}.` };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "The platform took too long to respond." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Engagement fetch failed." };
  }
}

/** Resolves each post's connection and fetches engagement in parallel, capped. */
export async function getEngagementForPosts(
  posts: SentPost[]
): Promise<Map<string, EngagementResult>> {
  const targets = posts.filter((p) => p.status === "published" && p.platform_post_id).slice(0, MAX_POSTS);
  const results = new Map<string, EngagementResult>();

  await Promise.all(
    targets.map(async (post) => {
      const conn = post.connection_id
        ? await getDecryptedConnectionById(post.connection_id)
        : await getDecryptedConnection(post.platform);
      if (!conn) {
        results.set(post.id, { ok: false, error: "No connected account to read this post from." });
        return;
      }
      results.set(post.id, await fetchPostEngagement(conn, post));
    })
  );

  return results;
}

export type EngagementSummary = {
  likes: number;
  comments: number;
  posts: number;
  missingScopes: string[];
};

/** 30-day rollup across the posts we could actually read. */
export function summarizeEngagement(
  posts: SentPost[],
  results: Map<string, EngagementResult>
): EngagementSummary {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const missingScopes = new Set<string>();
  let likes = 0;
  let comments = 0;
  let counted = 0;

  for (const p of posts) {
    const r = results.get(p.id);
    if (!r) continue;
    if (r.missingScope) missingScopes.add(r.missingScope);
    if (!r.ok) continue;
    if (p.published_at && new Date(p.published_at).getTime() < cutoff) continue;
    likes += r.engagement.likes ?? 0;
    comments += r.engagement.comments ?? 0;
    counted += 1;
  }

  return { likes, comments, posts: counted, missingScopes: [...missingScopes] };
}

function metaError(data: unknown): EngagementResult {
  const err = (data as { error?: { message?: string; code?: number } })?.error;
  const message = err?.message ?? "Meta API error";
  // "(#10) ... requires pages_read_engagement permission" / "...manage_insights..."
  const scopeMatch =
    /\b([a-z]+(?:_[a-z]+)*(?:_permission)?)\s+permission/i.exec(message) ??
    /permissions?:?\s+([a-z_,\s]+)/i.exec(message);
  let missingScope = scopeMatch?.[1]?.trim();
  if (!missingScope && /insight/i.test(message)) {
    missingScope = "read_insights (Facebook) / instagram_business_manage_insights (Instagram)";
  }
  return { ok: false, error: message, missingScope };
}

/** Pulls one insights metric ("reach"); returns the number, or a scope name if
 *  the token lacks read_insights / instagram_business_manage_insights. */
async function metaReach(
  host: string,
  id: string,
  metric: string,
  accessToken: string
): Promise<{ reach: number | null; missingScope?: string }> {
  const url = new URL(`https://${host}/${GRAPH_VERSION}/${id}/insights`);
  url.searchParams.set("metric", metric);
  url.searchParams.set("access_token", accessToken);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await res.json();
    if (!res.ok) {
      const scope = host.includes("instagram")
        ? "instagram_business_manage_insights"
        : "read_insights";
      return { reach: null, missingScope: scope };
    }
    return { reach: data.data?.[0]?.values?.[0]?.value ?? data.data?.[0]?.total_value?.value ?? null };
  } catch {
    return { reach: null };
  }
}

async function facebook(c: DecryptedConnection, id: string): Promise<EngagementResult> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${id}`);
  url.searchParams.set(
    "fields",
    "reactions.summary(total_count),comments.summary(total_count),shares"
  );
  url.searchParams.set("access_token", c.access_token);

  const [countsRes, reach] = await Promise.all([
    fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
    metaReach("graph.facebook.com", id, "post_impressions_unique", c.access_token),
  ]);
  const data = await countsRes.json();
  if (!countsRes.ok) return metaError(data);

  return {
    ok: true,
    engagement: {
      likes: data.reactions?.summary?.total_count ?? null,
      comments: data.comments?.summary?.total_count ?? null,
      shares: data.shares?.count ?? null,
      views: null,
      reach: reach.reach,
    },
    missingScope: reach.missingScope,
  };
}

async function instagram(c: DecryptedConnection, id: string): Promise<EngagementResult> {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/${id}`);
  url.searchParams.set("fields", "like_count,comments_count");
  url.searchParams.set("access_token", c.access_token);

  const [countsRes, reach] = await Promise.all([
    fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
    metaReach("graph.instagram.com", id, "reach", c.access_token),
  ]);
  const data = await countsRes.json();
  if (!countsRes.ok) return metaError(data);

  return {
    ok: true,
    engagement: {
      likes: data.like_count ?? null,
      comments: data.comments_count ?? null,
      shares: null,
      views: null,
      reach: reach.reach,
    },
    missingScope: reach.missingScope,
  };
}

async function tiktok(c: DecryptedConnection, id: string): Promise<EngagementResult> {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: [id] } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  const data = await res.json();
  const code: string = data?.error?.code ?? "";
  const message: string = data?.error?.message ?? "";

  if (!res.ok || (code && code !== "ok")) {
    const missingScope = /scope|permission|unauthor/i.test(`${code} ${message}`)
      ? "video.list"
      : undefined;
    return { ok: false, error: `${code || res.status}: ${message || "TikTok API error"}`, missingScope };
  }

  const v = data.data?.videos?.[0];
  if (!v) {
    return {
      ok: false,
      error:
        "TikTok returned no video for this ID — a SELF_ONLY / still-processing post isn't queryable, and the stored ID may be the publish_id rather than the video_id.",
    };
  }
  return {
    ok: true,
    engagement: {
      likes: v.like_count ?? null,
      comments: v.comment_count ?? null,
      shares: v.share_count ?? null,
      views: v.view_count ?? null,
      reach: null,
    },
  };
}
