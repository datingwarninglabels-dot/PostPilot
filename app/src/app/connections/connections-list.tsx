"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformConnection } from "@/lib/platform-connections";
import { disconnectConnectionAction } from "../actions";

const PLATFORMS: {
  key: PlatformConnection["platform"];
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
    note: "This app hasn't been through TikTok's audit, so published videos are only visible to the connected account (SELF_ONLY), not the public.",
  },
];

export function ConnectionsList({ connections }: { connections: PlatformConnection[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDisconnect(id: string) {
    setBusyId(id);
    try {
      await disconnectConnectionAction(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {PLATFORMS.map(({ key, label, startRoute, note }) => {
        const platformConnections = connections.filter((c) => c.platform === key);
        return (
          <div key={key} className="rounded border border-black/10 p-4 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium capitalize">{label}</h2>
              <button
                type="button"
                onClick={() => {
                  // Not an internal page — a Route Handler that 307s to an
                  // external OAuth provider, so a real navigation is correct
                  // here (and, unlike a plain <a href>, only fires on an
                  // actual click — browsers speculatively prefetch <a> links
                  // on hover, which was silently consuming the state cookie
                  // before the user ever clicked).
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.href = `/api/auth/${startRoute}/start`;
                }}
                className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
              >
                Connect {label}
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
                    className="flex items-center justify-between rounded bg-black/5 px-3 py-2 text-sm dark:bg-white/10"
                  >
                    <span>{c.account_name}</span>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleDisconnect(c.id)}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Disconnect
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
