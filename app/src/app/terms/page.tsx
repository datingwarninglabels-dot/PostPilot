export const metadata = {
  title: "Terms of Service",
  description: "Terms for PostPilot, a private single-owner social media tool.",
};

const CONTACT = "numewhou916@gmail.com";
const UPDATED = "September 3, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Terms of Service</h1>
      <p className="mt-1 text-muted">Last updated: {UPDATED}</p>

      <h2 className="mt-8 mb-2 font-semibold">What PostPilot is</h2>
      <p className="mb-4">
        PostPilot is a private social media automation tool used by a single owner to draft,
        review, schedule, and publish posts to their own Facebook, Instagram, and TikTok accounts,
        and to read and reply to comments and messages on those accounts. It has no public sign-up
        and no users other than the owner.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Acceptance</h2>
      <p className="mb-4">
        Signing in as the application&apos;s owner constitutes acceptance of these terms. There is
        no other way to access the application.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Use of connected accounts</h2>
      <p className="mb-4">
        The owner authorizes PostPilot to publish approved posts and send approved replies to
        their own connected Facebook, Instagram, and TikTok accounts. PostPilot takes no action on
        any account without the owner&apos;s explicit, per-item approval; it never auto-publishes
        or auto-replies.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">No warranty</h2>
      <p className="mb-4">
        PostPilot is provided as-is, for the owner&apos;s personal use, with no warranty of any
        kind. Publishing depends on third-party platform APIs that may change or fail.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Contact</h2>
      <p>
        <a href={`mailto:${CONTACT}`} className="underline">
          {CONTACT}
        </a>
      </p>
    </div>
  );
}
