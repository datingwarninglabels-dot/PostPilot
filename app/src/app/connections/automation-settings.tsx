"use client";

import { useRouter } from "next/navigation";
import { useActionRunner } from "@/components/toast";
import { Card } from "@/components/ui";
import { setAutoDraftAction } from "../actions";

// Keep in sync with HOURLY_CAP in lib/auto-draft.ts (not imported directly —
// that module is server-only).
const HOURLY_CAP = 20;

export function AutomationSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { pending, run } = useActionRunner();

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Auto-draft replies</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            When a new comment looks like a question (or is any DM) — contains &ldquo;?&rdquo;,
            mentions price, link, where, &ldquo;how do I&rdquo;, or &ldquo;still
            available&rdquo; — draft a reply automatically. Emoji-only messages, comments under 3
            words, and likely spam are skipped, and drafting stops at {HOURLY_CAP}/hour. This{" "}
            <strong>never sends</strong> anything — every draft still needs your Approve on the{" "}
            Comments page.
          </p>
        </div>
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            disabled={pending}
            onChange={(e) =>
              run(() => setAutoDraftAction(e.target.checked), { onSuccess: () => router.refresh() })
            }
          />
          <span className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-primary dark:bg-white/20" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </label>
      </div>
    </Card>
  );
}
