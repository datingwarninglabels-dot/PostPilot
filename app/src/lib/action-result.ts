/**
 * Every Server Action in this app returns one of these instead of throwing, so the
 * client can always show an unambiguous toast — a real "did that work?" answer tied
 * to what actually happened, not just "request submitted". `redirect()` still throws
 * (framework control flow); genuine bugs still throw. Expected failures — a platform
 * API rejecting a publish, an AI quota hit, a missing connection — come back as
 * `{ ok: false }` with a message written for the person reading it.
 */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export function ok(message?: string): ActionResult {
  return { ok: true, message };
}

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * Turns anything thrown into a short, human message. AI-provider and platform errors
 * often arrive as raw JSON strings or 429s — map the ones worth explaining.
 */
export function toUserMessage(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Something went wrong.";

  const lower = raw.toLowerCase();
  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("insufficient_quota")
  ) {
    return "The AI provider is rate-limited or out of quota right now. Wait a minute and try again, or check the provider's usage dashboard.";
  }
  if (lower.includes("missing openai_api_key") || lower.includes("missing gemini_api_key")) {
    return "The AI provider key isn't configured on the server. Set it in the environment and redeploy.";
  }
  if (
    lower.includes("invalid_token") ||
    lower.includes("code expired") ||
    lower.includes("session has expired") ||
    lower.includes("oauthexception")
  ) {
    return `${raw} — the account may need reconnecting on the Connections page.`;
  }
  return raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;
}
