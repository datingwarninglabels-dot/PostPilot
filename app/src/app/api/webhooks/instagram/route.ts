import { NextRequest, NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/webhook-signature";
import { upsertIncomingComment } from "@/lib/comments";

/**
 * Instagram webhook — comments and DMs, for the separate "Instagram API with Instagram
 * Login" app (own App ID/Secret/verify token, see meta/route.ts's Facebook sibling for
 * the identical GET-challenge/POST-signature mechanics — Meta uses the same scheme for
 * both webhook products, just different secrets/payload shapes).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse(null, { status: 403 });
}

type InstagramChange = {
  field: string;
  value?: {
    id?: string;
    text?: string;
    from?: { id?: string; username?: string };
    media?: { id?: string };
  };
};

type InstagramMessagingEvent = {
  sender?: { id?: string };
  message?: { mid?: string; text?: string };
};

type InstagramEntry = { changes?: InstagramChange[]; messaging?: InstagramMessagingEvent[] };

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(raw, signature, process.env.INSTAGRAM_APP_SECRET ?? "")) {
    return new NextResponse(null, { status: 403 });
  }

  let payload: { entry?: InstagramEntry[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error("Instagram webhook: signature ok but body is not JSON");
    return NextResponse.json({ ok: true });
  }

  for (const entry of payload.entry ?? []) {
    try {
      for (const change of entry.changes ?? []) {
        if (change.field === "comments" && change.value?.id) {
          await upsertIncomingComment({
            platform: "instagram",
            platformCommentId: change.value.id,
            postPlatformId: change.value.media?.id ?? null,
            messageType: "comment",
            authorName: change.value.from?.username ?? null,
            authorPlatformId: change.value.from?.id ?? null,
            body: change.value.text ?? "",
          });
        }
      }

      for (const msg of entry.messaging ?? []) {
        if (msg.message?.text && msg.message.mid) {
          await upsertIncomingComment({
            platform: "instagram",
            platformCommentId: msg.message.mid,
            messageType: "dm",
            authorPlatformId: msg.sender?.id ?? null,
            body: msg.message.text,
          });
        }
      }
    } catch (err) {
      console.error("Instagram webhook entry failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
