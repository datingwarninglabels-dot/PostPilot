"use client";

import { useRouter } from "next/navigation";
import type { PlatformConnectionWithHealth } from "@/lib/platform-connections";
import { CONNECTION_HEALTH } from "@/lib/status-display";
import { useActionRunner } from "@/components/toast";
import { Badge, Button, Card } from "@/components/ui";
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
          <Card key={key} className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{label}</h2>
              <Button
                onClick={() => {
                  // A Route Handler that 307s to an external OAuth provider — a real
                  // navigation, and only on an actual click (browsers prefetch <a> on
                  // hover, which was consuming the state cookie before the click).
                  window.location.assign(
                    new URL(`/api/auth/${startRoute}/start`, window.location.origin).toString()
                  );
                }}
              >
                {platformConnections.length > 0 ? `Reconnect ${label}` : `Connect ${label}`}
              </Button>
            </div>
            {note && <p className="mb-3 text-xs text-muted">{note}</p>}
            {platformConnections.length === 0 ? (
              <p className="text-sm text-muted">Not connected.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {platformConnections.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-black/[0.04] px-3 py-2 text-sm dark:bg-white/[0.06]"
                  >
                    <span className="font-medium">{c.account_name}</span>
                    <Badge tone={CONNECTION_HEALTH[c.health].tone}>{healthText(c)}</Badge>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => disconnectConnectionAction(c.id), {
                          onSuccess: () => router.refresh(),
                        })
                      }
                      className="ml-auto text-xs font-medium text-danger hover:underline disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
