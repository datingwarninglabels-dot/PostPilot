export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed">
      <h1 className="mb-6 text-xl font-semibold">Privacy Policy</h1>

      <p className="mb-4 text-neutral-500">
        Last updated: this is a placeholder policy for an internal, single-owner tool — not a
        public-facing product. It exists to satisfy platform developer-console requirements
        (e.g. TikTok Sandbox) that a Privacy Policy URL be provided.
      </p>

      <h2 className="mt-6 mb-2 font-medium">What this application is</h2>
      <p className="mb-4">
        This is an internal social media automation tool used by a single owner to draft, review,
        schedule, and publish posts to their own Facebook, Instagram, and TikTok accounts. It has
        no public sign-up and no end users other than the owner.
      </p>

      <h2 className="mt-6 mb-2 font-medium">Data we collect</h2>
      <p className="mb-4">
        When the owner connects a Facebook, Instagram, or TikTok account, we store the OAuth
        access/refresh tokens (encrypted at rest) and basic account identifiers (account name and
        ID) needed to publish posts on the owner&apos;s behalf. We also store the content the owner
        drafts and schedules, including any media URLs attached to a post.
      </p>

      <h2 className="mt-6 mb-2 font-medium">How we use it</h2>
      <p className="mb-4">
        Stored tokens are used exclusively to publish the owner&apos;s own approved, scheduled
        posts to the owner&apos;s own connected accounts. Nothing is shared with, or accessible to,
        any third party.
      </p>

      <h2 className="mt-6 mb-2 font-medium">Data retention and deletion</h2>
      <p className="mb-4">
        Connected-account tokens are retained until the owner disconnects the account (removing the
        stored tokens immediately) or revokes access from the platform&apos;s own settings.
      </p>

      <h2 className="mt-6 mb-2 font-medium">Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:numewhou916@gmail.com" className="underline">
          numewhou916@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
