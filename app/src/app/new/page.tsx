"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateDraftAction } from "../actions";
import type { Platform } from "@/lib/posts";

const PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok"];

export default function NewDraftPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [productDescription, setProductDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await generateDraftAction({ platform, productDescription });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate draft");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <a href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back to dashboard
      </a>
      <h1 className="mt-2 mb-6 text-xl font-semibold">New draft from a product description</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`rounded border px-3 py-1.5 text-sm capitalize ${
                  platform === p
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Describe the new product</label>
          <textarea
            required
            rows={6}
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="e.g. A refillable glass water bottle with a built-in fruit infuser, launching in three colors..."
            className="w-full rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15"
          />
        </div>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        <button
          type="submit"
          disabled={loading || !productDescription.trim()}
          className="self-start rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Drafting…" : "Generate draft"}
        </button>
      </form>
    </div>
  );
}
