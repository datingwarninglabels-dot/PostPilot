export const metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed">
      <h1 className="mb-6 text-xl font-semibold">Terms of Service</h1>

      <p className="mb-4 text-neutral-500">
        Last updated: this is a placeholder terms document for an internal, single-owner tool —
        not a public-facing product. It exists to satisfy platform developer-console requirements
        (e.g. TikTok) that a Terms of Service URL be provided.
      </p>

      <h2 className="mt-6 mb-2 font-medium">What this application is</h2>
      <p className="mb-4">
        This is an internal social media automation tool used by a single owner to draft, review,
        schedule, and publish posts to their own Facebook, Instagram, and TikTok accounts. It has
        no public sign-up and no end users other than the owner.
      </p>

      <h2 className="mt-6 mb-2 font-medium">Acceptance of terms</h2>
      <p className="mb-4">
        By signing in as the application&apos;s admin, the owner agrees to these terms. There is no
        other way to access this application.
      </p>

      <h2 className="mt-6 mb-2 font-medium">Use of connected accounts</h2>
      <p className="mb-4">
        The owner authorizes this application to publish approved, scheduled posts to their own
        connected Facebook, Instagram, and TikTok accounts, and, where enabled, to read and reply
        to comments/DMs on those accounts. The application takes no action on any account without
        the owner&apos;s explicit approval of each post or reply.
      </p>

      <h2 className="mt-6 mb-2 font-medium">No warranty</h2>
      <p className="mb-4">
        This application is provided as-is, for the owner&apos;s personal use, with no warranty of
        any kind.
      </p>

      <h2 className="mt-6 mb-2 font-medium">Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href="mailto:numewhou916@gmail.com" className="underline">
          numewhou916@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
