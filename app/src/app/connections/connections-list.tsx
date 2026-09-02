"use client";

import { useRouter } from "next/navigation";
import type { PlatformConnectionWithHealth } from "@/lib/platform-connections";
import { useActionRunner } from "@/components/toast";
import { disconnectConnectionAction } from "../actions";

const PLATFORMS: {
  key: PlatformConnectionWithHealth["platform"];
  label: string;
  startRoute: string;
  note?: string;
}[] = [
  { key: "facebook", label: "Facebook", startRoute: "meta" },
  { key: "instagram", label: "Instagram", startRoute: "instagram" },
  {
    key: "tiktok",
    label: "TikTok",
    startRoute: "tiktok",
    note: "This app hasn't been through TikTok's review yet, so posts publish as SELF_ONLY — visible only to the connected account, not the public.",
  },
];

const HEALTH_BADGE: Record<PlatformConnectionWithHealth["health"], string> = {
  ok: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  expiring: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  expired: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function healthText(c: PlatformConnectionWithHealth): string {
  if (c.health === "expired") return "Token expired — reconnect";
  if (c.health === "expiring") return `Token expires in ${c.expires_in_days}d`;
  return c.expires_at ? "Token valid" : "No expiry";
}

export function ConnectionsList({
  connections,
}: {
  connections: PlatformConnectionWithHealth[];
}) {
  const router = useRouter();
  const { pending, run } = useActionRunner();

  return (
    <div className="flex flex-col gap-4">
      {PLATFORMS.map(({ key, label, startRoute, note }) => {
        const platformConnections = connections.filter((c) => c.platform === key);
        return (
          <section
            key={key}
            className="rounded-lg border border-black/10 p-4 dark:border-white/10"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{label}</h2>
              <button
                type="button"
                onClick={() => {
                  // A Route Handler that 307s to an external OAuth provider — a real
                  // navigation, and only on an actual click (browsers prefetch <a> on
                  // hover, which was consuming the state cookie before the click).
                  window.location.assign(
                    new URL(`/api/auth/${startRoute}/start`, window.location.origin).toString()
                  );
                }}
                className="inline-flex min-h-9 items-center rounded-md border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.05]"
              >
                {platformConnections.length > 0 ? `Reconnect ${label}` : `Connect ${label}`}
              </button>
            </div>
            {note && <p className="mb-3 text-xs text-neutral-500">{note}</p>}
            {platformConnections.length === 0 ? (
              <p className="text-sm text-neutral-500">Not connected.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {platformConnections.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-black/5 px-3 py-2 text-sm dark:bg-white/10"
                  >
                    <span className="font-medium">{c.account_name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${HEALTH_BADGE[c.health]}`}
                    >
                      {healthText(c)}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => disconnectConnectionAction(c.id), {
                          onSuccess: () => router.refresh(),
                        })
                      }
                      className="ml-auto text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Disconnect
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
