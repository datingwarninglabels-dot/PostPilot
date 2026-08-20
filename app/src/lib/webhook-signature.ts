import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the RAW request body (must be
 * checked before JSON.parse — the signature covers the exact bytes Meta sent). Shared by
 * the Facebook and Instagram webhook routes, which are separate Meta apps with separate
 * secrets but identical signing mechanics.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = Buffer.from(
    createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"),
    "hex"
  );
  const provided = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}
