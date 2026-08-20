import { NextRequest, NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/webhook-signature";
import { upsertIncomingComment } from "@/lib/comments";

/**
 * Facebook Page webhook — comments (`feed`) and Messenger DMs (`messaging`). Public,
 * unauthenticated by session (see proxy.ts's api/webhooks exemption); Meta's own
 * verify_token challenge (GET) and X-Hub-Signature-256 (POST) are the actual auth.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse(null, { status: 403 });
}

type MetaChange = {
  field: string;
  value?: {
    item?: string;
    comment_id?: string;
    post_id?: string;
    message?: string;
    from?: { id?: string; name?: string };
  };
};

type MetaMessagingEvent = {
  sender?: { id?: string };
  message?: { mid?: string; text?: string };
};

type MetaEntry = { changes?: MetaChange[]; messaging?: MetaMessagingEvent[] };

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(raw, signature, process.env.META_APP_SECRET ?? "")) {
    return new NextResponse(null, { status: 403 });
  }

  const payload = JSON.parse(raw) as { entry?: MetaEntry[] };

  for (const entry of payload.entry ?? []) {
    try {
      for (const change of entry.changes ?? []) {
        if (change.field === "feed" && change.value?.item === "comment" && change.value.comment_id) {
          await upsertIncomingComment({
            platform: "facebook",
            platformCommentId: change.value.comment_id,
            postPlatformId: change.value.post_id ?? null,
            messageType: "comment",
            authorName: change.value.from?.name ?? null,
            authorPlatformId: change.value.from?.id ?? null,
            body: change.value.message ?? "",
          });
        }
      }

      for (const msg of entry.messaging ?? []) {
        if (msg.message?.text && msg.message.mid) {
          await upsertIncomingComment({
            platform: "facebook",
            platformCommentId: msg.message.mid,
            messageType: "dm",
            authorPlatformId: msg.sender?.id ?? null,
            body: msg.message.text,
          });
        }
      }
    } catch (err) {
      console.error("Meta webhook entry failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
