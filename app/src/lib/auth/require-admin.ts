import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";

/**
 * The actual authorization boundary — proxy.ts's redirect is only an
 * optimistic convenience (Next.js explicitly recommends not relying on it
 * alone). Every protected page and Server Action calls this first.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createSupabaseServerClient();

  let user: User | null = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (err) {
    console.error("Admin auth check failed:", err);
    redirect("/login");
  }

  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  return user;
}
