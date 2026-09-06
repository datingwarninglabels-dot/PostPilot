export const metadata = {
  title: "Data Deletion",
  description: "How to request deletion of data PostPilot has stored about a connected account.",
};

const CONTACT = "numewhou916@gmail.com";
const UPDATED = "September 5, 2026";

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Data Deletion Instructions</h1>
      <p className="mt-1 text-muted">Last updated: {UPDATED}</p>

      <h2 className="mt-8 mb-2 font-semibold">How to request deletion</h2>
      <p className="mb-4">
        Email{" "}
        <a href={`mailto:${CONTACT}`} className="underline">
          {CONTACT}
        </a>{" "}
        from the address associated with the connected account, stating which account
        (Facebook Page, Instagram account, or TikTok profile) to delete data for. Requests are
        processed within 7 days, and you&apos;ll receive a confirmation email once complete.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">What gets deleted</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>The stored OAuth access and refresh tokens for that account.</li>
        <li>
          Post drafts, scheduled posts, and publish history associated with that account&apos;s
          connection.
        </li>
        <li>
          Comments, direct messages, and drafted or sent replies retrieved for that account.
        </li>
        <li>The activity log entries recorded for that account.</li>
      </ul>

      <h2 className="mt-6 mb-2 font-semibold">Another way to revoke access</h2>
      <p className="mb-4">
        You can also revoke PostPilot&apos;s access at any time from the platform&apos;s own
        settings (Facebook Business Integrations, Instagram Apps and Websites, or TikTok Manage
        Account &gt; Connected Accounts), which immediately invalidates the tokens PostPilot holds.
        Contact us at the address above to also remove the associated stored records.
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
