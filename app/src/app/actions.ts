"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { draftPostContent } from "@/lib/generate";
import type { Platform } from "@/lib/posts";

export async function generateDraftAction(input: {
  platform: Platform;
  productDescription: string;
}) {
  await requireAdmin();

  const content = await draftPostContent(input.platform, input.productDescription);

  const { error } = await getSupabaseAdmin().from("posts").insert({
    platform: input.platform,
    post_type: "product_announcement",
    source_product_description: input.productDescription,
    content,
    status: "draft",
  });
  if (error) throw error;

  revalidatePath("/");
}

export async function updatePostContentAction(id: string, content: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function approvePostAction(id: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function rejectPostAction(id: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

/** Scheduling implicitly approves — only approved content should ever carry a schedule time. */
export async function schedulePostAction(id: string, scheduledAtIso: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "scheduled", scheduled_at: scheduledAtIso, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function unschedulePostAction(id: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "approved", scheduled_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}
