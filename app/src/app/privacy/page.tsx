export const metadata = {
  title: "Privacy Policy",
  description: "How PostPilot handles connected-account data for its single owner.",
};

const CONTACT = "numewhou916@gmail.com";
const UPDATED = "September 3, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-muted">Last updated: {UPDATED}</p>

      <h2 className="mt-8 mb-2 font-semibold">What PostPilot is</h2>
      <p className="mb-4">
        PostPilot is a private social media automation tool used by a single owner to draft,
        review, schedule, and publish posts to their own Facebook Pages, Instagram accounts, and
        TikTok profile, and to read and reply to comments and direct messages on those accounts.
        It has no public sign-up and no users other than the owner.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Data we store</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>
          OAuth access and refresh tokens for each connected account, encrypted at rest, and the
          account name and ID needed to act on the owner&apos;s behalf.
        </li>
        <li>
          Post drafts, scheduled times, media URLs, and publish results (success, failure,
          timestamps, platform post IDs).
        </li>
        <li>
          Incoming comments and direct messages retrieved via platform webhooks — the message
          text, author name/ID, and the reply the owner approves and sends.
        </li>
        <li>
          An activity log of every draft, edit, approval, publish attempt, and reply, kept so the
          owner can audit what the tool did.
        </li>
      </ul>

      <h2 className="mt-6 mb-2 font-semibold">How we use it</h2>
      <p className="mb-4">
        Stored tokens are used only to publish the owner&apos;s approved posts and send the
        owner&apos;s approved replies to the owner&apos;s own connected accounts. No post or reply
        is published or sent without the owner&apos;s explicit approval. Data is not sold, shared
        with third parties, or used for advertising or analytics.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Retention and deletion</h2>
      <p className="mb-4">
        Tokens are deleted immediately when the owner disconnects an account in PostPilot; the
        owner can also revoke access from the platform&apos;s own settings. Post, comment, and
        activity records are retained for the owner&apos;s reference and can be deleted on
        request — see{" "}
        <a href="/data-deletion" className="underline">
          Data Deletion Instructions
        </a>
        .
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Contact</h2>
      <p>
        Questions or deletion requests:{" "}
        <a href={`mailto:${CONTACT}`} className="underline">
          {CONTACT}
        </a>
        .
      </p>
    </div>
  );
}
