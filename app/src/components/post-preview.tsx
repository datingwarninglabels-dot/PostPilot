import type { Platform } from "@/lib/posts";

/**
 * A rough, recognisable approximation of how a post will look on each platform —
 * enough to catch a caption that's too long, a missing image, or hashtags that
 * read badly. Not pixel-perfect and deliberately not claiming to be.
 */
export function PostPreview({
  platform,
  content,
  mediaUrl,
  accountName,
}: {
  platform: Platform;
  content: string;
  mediaUrl?: string;
  accountName?: string | null;
}) {
  const handle = accountName || "your account";
  const media = mediaUrl?.trim();

  const frame =
    "mx-auto max-w-sm overflow-hidden rounded-xl border border-border bg-card text-sm";

  if (platform === "instagram") {
    return (
      <div className={frame}>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 to-fuchsia-500" />
          <span className="font-semibold">{handle}</span>
        </div>
        <MediaBox media={media} ratio="aspect-square" required label="Instagram needs an image" />
        <div className="px-3 py-2">
          <p className="whitespace-pre-wrap">
            <span className="font-semibold">{handle}</span> {content}
          </p>
        </div>
      </div>
    );
  }

  if (platform === "tiktok") {
    return (
      <div className={frame}>
        <MediaBox media={media} ratio="aspect-[9/16]" required label="TikTok needs a video" video />
        <div className="px-3 py-2">
          <p className="font-semibold">@{handle}</p>
          <p className="whitespace-pre-wrap text-muted">{content}</p>
          {content.length > 150 && (
            <p className="mt-1 text-xs text-amber-600">
              TikTok captions are short — this is {content.length} characters.
            </p>
          )}
        </div>
      </div>
    );
  }

  // facebook
  return (
    <div className={frame}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="h-9 w-9 rounded-full bg-blue-600/20" />
        <div>
          <p className="font-semibold leading-tight">{handle}</p>
          <p className="text-xs text-muted">Just now · Public</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap px-3 pb-2">{content}</p>
      {media && <MediaBox media={media} ratio="aspect-video" />}
    </div>
  );
}

function MediaBox({
  media,
  ratio,
  required,
  label,
  video,
}: {
  media?: string;
  ratio: string;
  required?: boolean;
  label?: string;
  video?: boolean;
}) {
  if (media) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media} alt="" className={`${ratio} w-full bg-black/5 object-cover`} />;
  }
  return (
    <div
      className={`${ratio} flex w-full items-center justify-center bg-black/[0.04] text-xs text-muted dark:bg-white/[0.06]`}
    >
      {required ? (label ?? "Media required") : video ? "Video" : "No image"}
    </div>
  );
}
