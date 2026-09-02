"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionRunner } from "@/components/toast";
import { Button, inputClass } from "@/components/ui";
import { generateDraftAction } from "../actions";
import type { Platform } from "@/lib/posts";

const PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok"];

type ConnectionOption = { id: string; platform: Platform; account_name: string };

export function NewDraftForm({ connections }: { connections: ConnectionOption[] }) {
  const router = useRouter();
  const { pending, run } = useActionRunner();
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [productDescription, setProductDescription] = useState("");
  const [connectionId, setConnectionId] = useState<string>("");

  const platformConnections = useMemo(
    () => connections.filter((c) => c.platform === platform),
    [connections, platform]
  );

  function selectPlatform(p: Platform) {
    setPlatform(p);
    const forP = connections.filter((c) => c.platform === p);
    setConnectionId(forP.length === 1 ? forP[0].id : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(
      () =>
        generateDraftAction({
          platform,
          productDescription,
          connectionId: connectionId || null,
        }),
      { silentSuccess: true }
    );
    if (result.ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Platform</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platform === p}
              onClick={() => selectPlatform(p)}
              className={`min-h-9 rounded-control border px-3 py-1.5 text-sm capitalize transition-colors ${
                platform === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-strong hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="account" className="mb-1.5 block text-sm font-medium">
          Publish to{" "}
          <span className="font-normal text-muted">(optional now, required before approval)</span>
        </label>
        {platformConnections.length === 0 ? (
          <p className="text-sm text-muted">
            No {platform} account connected yet — you can still draft, then connect one before
            approving.
          </p>
        ) : (
          <select
            id="account"
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className={inputClass}
          >
            <option value="">Decide later</option>
            {platformConnections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.account_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
          Describe the product
        </label>
        <textarea
          id="description"
          required
          rows={6}
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          placeholder="e.g. A refillable glass water bottle with a built-in fruit infuser, launching in three colors…"
          className={inputClass}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={pending || !productDescription.trim()}
        className="min-h-10 self-start px-4"
      >
        {pending ? "Drafting…" : "Generate draft"}
      </Button>
    </form>
  );
}
