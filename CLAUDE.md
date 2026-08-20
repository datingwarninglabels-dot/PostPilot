# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Product: Social Media Automation System

Lets the owner use OpenAI to draft product-announcement posts, review/schedule them before they go
live, and (later) monitor comments/DMs with AI-drafted, human-approved replies.

Decisions already made (do not re-litigate):

- **Platforms**: Facebook, Instagram, and TikTok all in scope from the start (not phased — TikTok's
  Content Posting API registration/review runs in parallel with Meta's, not after it).
- **Replies**: approve-then-send only. No auto-reply.
- **Database**: a fresh, dedicated Supabase project — not the dating-warning-labels quiz app's.

## The part that isn't a coding problem

Meta (Facebook/Instagram) and TikTok both require registering a developer app and going through their
own App Review before the app can post to real, public-facing accounts or read real comments/DMs. This
is a manual review process on their side — sometimes days to weeks — and nothing here can speed it up.
**Start both registrations in parallel with building, not after Phase 1 is done.** Development-mode
access (your own accounts only) works without waiting on review; Phase 1 doesn't need it at all.

## Current state of this repo

- `app/` — Next.js (App Router, TypeScript, Tailwind v4) + Supabase, scaffolded fresh (not copied from
  the quiz app, since the two have very different shapes — this is an internal tool, not a public
  funnel). Has its own `CLAUDE.md`/`AGENTS.md` pointing out that this Next.js version (16) may postdate
  training data — check `app/node_modules/next/dist/docs/` before relying on remembered App Router APIs.

### Commands (run from `app/`)

```
npm run dev      # start dev server (Turbopack), http://localhost:3000
npm run build    # production build — also type-checks
npm run start    # serve the production build
npm run lint     # ESLint
```

There is no test suite yet.

### Supabase

**Real project exists**: project ref `zbuliehovticxushbidy`, in the `lumen studio` org, schema applied.
This is an **internal-only tool** — unlike the quiz app there's no public-facing anon access anywhere,
so all data access goes through the service-role client (`app/src/lib/supabase-admin.ts`,
`getSupabaseAdmin()`, throws if unconfigured) from trusted server contexts (Server Actions, the future
cron publisher) — never from a Client Component. `app/src/lib/auth/` holds the separate
`@supabase/ssr`-based clients used for admin sign-in (`server.ts`/`browser.ts`), mirroring the quiz
app's admin-dashboard pattern but gating the *entire* app, not just an `/admin` subsection — see
`app/src/proxy.ts` and `app/src/lib/auth/require-admin.ts` (`requireAdmin()` is the actual authorization
boundary; proxy.ts's redirect is only an optimistic convenience, per Next's own docs).

Copy `app/.env.local.example` to `app/.env.local` and fill in: Supabase URL/anon key/service role key,
`ADMIN_EMAIL`, `AI_PROVIDER` + the matching provider key (`OPENAI_API_KEY` or `GEMINI_API_KEY`) (Phase
1); `META_APP_ID`/`META_APP_SECRET`, `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET`, `APP_BASE_URL`,
`TOKEN_ENCRYPTION_KEY`, `CRON_SECRET` (Phase 2 — all in use now, see below);
`META_WEBHOOK_VERIFY_TOKEN`/`INSTAGRAM_WEBHOOK_VERIFY_TOKEN` (Phase 3, see "Comments + replies" below).

The schema (applied directly via migration, not yet checked into a `supabase/migrations/` folder —
do that whenever `supabase db pull`/`link` gets set up) defines:

- `posts` — `platform` (facebook/instagram/tiktok), `post_type`, `source_product_description` (the
  input used to generate the draft), `content`, `media_urls`, `status`
  (draft/approved/rejected/scheduled/published/failed), `scheduled_at`, `published_at`,
  `platform_post_id`, `error_message`.
- `platform_connections` — OAuth tokens per connected account (Phase 2, in use — see below).
  `access_token_encrypted`/`refresh_token_encrypted` are named to force the point: encrypt at the
  application layer with a server-side secret before insert — this column is ciphertext, not a raw
  token holder.
- `comments` / `replies` — incoming comments/DMs (facebook/instagram only — TikTok is explicitly out
  of scope, see below) and their drafted/approved replies (Phase 3, in use — see below).

RLS is enabled on all four tables with **no policies** — default-deny as a defense-in-depth backstop,
since the service-role client bypasses RLS entirely and nothing else should ever be querying these
tables.

**Not yet done**: creating the admin user in Supabase Auth (Dashboard → Authentication → Users → Add
user, using `ADMIN_EMAIL`) — there's no public sign-up flow, same as the quiz app. Until that user
exists, `/login` has nothing to authenticate against.

### Content generation (Phase 1, done)

`app/src/lib/generate.ts` — `draftPostContent(platform, productDescription)`, routes to `openai`
(`gpt-4o` via Chat Completions) or `gemini` (`gemini-3.7-flash` via `@google/genai`'s Interactions API, since Google gated the older
`generateContent`-based models off from new API keys) based on the
`AI_PROVIDER` env var (defaults to `openai`), each with its own lazy client that throws a clear error
if its key is unset. Per-platform style guidance (Facebook/Instagram/TikTok tone and length) lives in
`PLATFORM_GUIDANCE` in that file.

`app/src/app/new/page.tsx` — the drafting UI: pick a platform, describe the product, submit. Calls the
`generateDraftAction` Server Action (`app/src/app/actions.ts`), which inserts a new `posts` row with
`status: "draft"` and redirects to the dashboard. **Doesn't touch any social platform API** — pure
drafting, fully testable today with just `OPENAI_API_KEY` and Supabase configured.

### Dashboard (Phase 1, done)

`app/src/app/page.tsx` (the root route, gated) fetches non-published/non-rejected posts via
`listActivePosts()` (`app/src/lib/posts.ts`) and renders `app/src/app/dashboard.tsx` — a client
component listing each post as a card: editable content, Approve/Reject for drafts, and a
datetime-local scheduler for approved posts. All mutations are Server Actions in `app/src/app/
actions.ts` (`updatePostContentAction`, `approvePostAction`, `rejectPostAction`,
`schedulePostAction`/`unschedulePostAction`), each re-running `requireAdmin()` before touching the
service-role client — Server Actions are callable directly, so the proxy-level gate alone isn't
sufficient there either.

### Connections + publishing (Phase 2, done)

`app/src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt for tokens at rest, keyed by
`TOKEN_ENCRYPTION_KEY`. `app/src/lib/platform-connections.ts` — CRUD over `platform_connections`;
`getDecryptedConnection(platform)` assumes **one connected account per platform** (picks the first row)
since posts don't carry a target account — revisit if multiple Pages/accounts per platform is ever
needed.

**Instagram is a separate Meta app/product from Facebook, not a sub-feature of it.** Meta's platform
has two independent Instagram integration paths — "Instagram API with Facebook Login" (needs a linked
Facebook Page, scopes `instagram_basic`/`instagram_content_publish`, but only works via a special
"Business Login for Instagram" onboarding call this app doesn't implement) vs "Instagram API with
Instagram Login" (standalone, its own App ID/Secret, no Page needed, scopes
`instagram_business_basic`/`instagram_business_content_publish`, host `graph.instagram.com`). This app
uses the **second** one. Requesting `instagram_basic`/`instagram_content_publish` on a plain Facebook
Login call fails with "Invalid Scopes" — don't re-add them to `META_OAUTH_SCOPES` in
`meta/start/route.ts`.

OAuth: `app/src/app/api/auth/{meta,tiktok,instagram}/{start,callback}/route.ts`. Meta's callback
exchanges the code for a long-lived user token and lists the owner's Facebook Pages via `/me/accounts`,
storing a `facebook` connection per Page — Facebook only, no Instagram. Instagram's callback is
entirely separate: authorizes at `www.instagram.com/oauth/authorize`, exchanges the code at
`api.instagram.com/oauth/access_token` (response wrapped in `{data:[...]}`, see `unwrap()` in that
file), exchanges for a 60-day long-lived token at `graph.instagram.com/access_token`
(`grant_type=ig_exchange_token`), then reads `graph.instagram.com/.../me` for the username. Uses
`INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET` — a completely different app from `META_APP_ID`/`SECRET`.
TikTok's callback stores the access/refresh token pair directly (see PKCE note below). All three use a
short-lived httpOnly `state` cookie for CSRF protection and redirect to `/connections?error=...` on
failure. `/connections` (`app/src/app/connections/`) is the admin UI to connect/disconnect accounts,
one button per platform.

**TikTok requires PKCE** even though TikTok's own Login Kit for Web doc doesn't mention it — real
enforcement is ahead of the docs (possibly Sandbox-specific). `tiktok/start/route.ts` generates a
`code_verifier`, stores it in a cookie, and sends `code_challenge` as a **hex-encoded** SHA-256 digest
(not the RFC 7636 base64url encoding — TikTok's own quirk, confirmed via their Login Kit for Desktop
docs) with `code_challenge_method=S256`. The callback sends `code_verifier` back in the token exchange.

Publishing: `app/src/lib/publishers/{facebook,instagram,tiktok}.ts`, one `publish(connection, post)`
each. **Instagram and TikTok have no text-only post type** — both require `media_urls[0]`, unlike
Facebook — so `dashboard.tsx` now has a media URL field per post, required before Instagram/TikTok
posts can be approved (`MEDIA_REQUIRED` in that file). Instagram's publisher calls
`graph.instagram.com` directly with the IG account's own access token (`Authorization: Bearer` header),
not a Facebook Page token — only handles image posts (not video/Reels). **TikTok**:
`app/src/lib/publishers/tiktok.ts` only *submits* the post via `PULL_FROM_URL` and returns TikTok's
`publish_id` — it does not poll `/v2/post/publish/status/fetch/` for final confirmation, and until this
app passes TikTok's audit, `privacy_level` is forced to `SELF_ONLY` (published videos are only visible
to the connected account, not the public) regardless of what's requested.

`app/src/app/api/cron/publish/route.ts` is the scheduler: `GET` with
`Authorization: Bearer $CRON_SECRET` (the header Vercel Cron sends) selects `posts` where
`status = 'scheduled' AND scheduled_at <= now()`, publishes each via the matching connection, and sets
`published`/`platform_post_id` or `failed`/`error_message`. Not wired to an actual cron trigger yet —
nothing is deployed (see below), so for now this only runs when hit manually.

**The dev server runs over HTTPS, not HTTP.** Instagram's "Instagram API with Instagram Login" product
flat-out rejects `http://` redirect URIs at save time (Facebook Pages and TikTok accept either) —
Meta's dashboard errors with "Error saving redirect URIs" if you try. Since `APP_BASE_URL` is shared
across all three OAuth flows, the whole app runs under HTTPS to match: `next dev --experimental-https`
with a self-signed cert at `app/certificates/` (`*.pem`, gitignored), generated once via
`openssl req -x509 -newkey rsa:2048 ... -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`
— **not** `mkcert` (the flag's default), because `mkcert -install`'s CA-trust step needs an interactive
Windows admin prompt that a background dev-server process can never satisfy; passing our own cert via
`--experimental-https-key`/`--experimental-https-cert` skips that step entirely. See the
`social-media-automation-dev` config in the session-root `.claude/launch.json` (`C:\Users\lifes\Downloads\.claude\launch.json`
— this is the file the preview tooling actually resolves, not either repo-level `launch.json`).
Because it's self-signed, Claude's own Browser pane refuses to navigate to it at all (no way to click
through the "not secure" interstitial) — verify with `curl -k` instead; a real browser just needs
"Advanced → Proceed to localhost" once.

**Manual setup only the account owner can do** (Meta's and TikTok's own developer dashboards — not
reachable by Claude): register `https://localhost:3001/api/auth/meta/callback`,
`https://localhost:3001/api/auth/instagram/callback`, and `https://localhost:3001/api/auth/tiktok/callback`
(all HTTPS now) as valid OAuth redirect URIs on their respective apps (Instagram's redirect URI is
configured under App Dashboard > Instagram > API setup with Instagram login > Business login settings —
separate from the Facebook app's Login settings), and make sure the signed-in Meta/TikTok account is
added as a Page admin / app tester so development-mode OAuth succeeds.

### Comments + replies (Phase 3, done — Facebook + Instagram only)

**TikTok is explicitly out of scope for this phase** — its public API doesn't reliably expose comment
webhooks or reply access to third-party apps, unlike Meta. Revisit only if TikTok grants the right
scopes during app review.

`app/src/lib/comments.ts` — `Comment`/`Reply`/`CommentWithReply` types + `listActiveComments()`
(excludes `replied`/`ignored`), `getCommentById()`, `upsertIncomingComment()` (upsert on
`platform,platform_comment_id` with `ignoreDuplicates: true` — Meta redelivers webhooks on any
non-200/slow response, must not clobber status). `draftReplyContent()` in `generate.ts` is the reply
sibling of `draftPostContent()`, same OpenAI/Gemini provider routing.

Webhooks: `app/src/app/api/webhooks/{meta,instagram}/route.ts`, both public (see `proxy.ts`'s
`api/webhooks` exemption) since Meta's servers hit them with no session. `GET` answers Meta's
`hub.challenge` verification handshake against `META_WEBHOOK_VERIFY_TOKEN`/
`INSTAGRAM_WEBHOOK_VERIFY_TOKEN`. `POST` verifies `X-Hub-Signature-256` over the **raw** body (via
`app/src/lib/webhook-signature.ts`'s `verifyMetaSignature()`, HMAC-SHA256 keyed by `META_APP_SECRET`/
`INSTAGRAM_APP_SECRET` — the same app secrets already used for OAuth, no new secret needed) before
`JSON.parse`, then upserts each Page-feed/IG comment (`entry[].changes[]`) and each Messenger/IG DM
(`entry[].messaging[]`) into `comments`, per-entry try/catch so one bad entry doesn't drop the batch.
Always returns `200` fast — Meta disables subscriptions that repeatedly time out or error.

Each connected Page/IG account must individually call `/{id}/subscribed_apps` after connecting (app-
level webhook config alone isn't enough) — wired into `meta/callback/route.ts` and
`instagram/callback/route.ts` right after `upsertConnection`, non-fatal if it fails.

**OAuth scopes expanded for Phase 3**: `META_OAUTH_SCOPES` gained `pages_manage_engagement` (read/
reply to Page comments) and `pages_messaging` (Messenger Send API); `INSTAGRAM_OAUTH_SCOPES` gained
`instagram_business_manage_comments` and `instagram_business_manage_messages`. **Any account connected
before this change has a token without these scopes and must be disconnected/reconnected** via
`/connections` before replies will work — this also re-triggers the `subscribed_apps` call.

Replying: `app/src/lib/repliers/{facebook,instagram}.ts`, `sendReply(connection, comment, text)`,
branching on `comment.message_type`. Facebook comment replies use the publisher's body-param
`access_token` convention; Facebook DMs go through the Messenger Send API
(`POST /me/messages?access_token=...`, query-param auth — the one place this deviates from the
body-param convention, matches Meta's own Send API docs). Instagram replies (comment and DM) both use
`Authorization: Bearer`, matching the Instagram publisher.

UI: `/comments` (`app/src/app/comments/`), same card-list pattern as the dashboard. Per comment:
"Generate reply" (AI draft, only if none exists) → editable draft + "Save edit" → "Approve"/"Reject"
(only while `reply.status === "draft"`) → "Send" (only while `reply.status === "approved"`).
Approve-then-send only — **no auto-reply**, this is a settled product decision, don't wire one up.

**Manual setup only the account owner can do**, same category as Phase 2's OAuth redirect URIs:
generate and set `META_WEBHOOK_VERIFY_TOKEN`/`INSTAGRAM_WEBHOOK_VERIFY_TOKEN`; once deployed, configure
the Webhooks product on each Meta app pointing at `https://<deployed-host>/api/webhooks/{meta,instagram}`
with those verify tokens, confirm the challenge goes green; then reconnect Facebook/Instagram from
`/connections` (new scopes). **Not yet done** — nothing is deployed yet (see Deployment below), so
webhooks aren't registered with Meta and have only been exercised locally with hand-crafted, correctly-
signed curl payloads (confirmed: GET challenge, POST signature verification pass/fail, and all three
payload-parsing branches — Facebook comment, Facebook DM, Instagram comment — correctly upsert into
`comments`). Real Meta traffic, and the repliers' actual `sendReply` calls, are unverified until after
deployment + reconnecting with the new scopes.

### Deployment

Not deployed anywhere yet. `.claude/launch.json` (both at this repo's root and inside `app/`) has a
`social-media-automation-dev` dev-server config on **port 3001** (not 3000) — the sibling
dating-warning-labels-extracted repo's dev server config already claims 3000 at the session root's
`.claude/launch.json`, and the preview tooling resolves configs from that root file first regardless of
which subdirectory's `launch.json` you'd expect it to use.

## Build order (from the brief)

1. ~~Scaffold Next.js + Supabase~~ — done
2. ~~Draft & approve dashboard (Phase 1)~~ — done, code-complete; **not yet live-tested** (no admin user
   created, no `SUPABASE_SERVICE_ROLE_KEY`/`OPENAI_API_KEY` filled in — see Supabase section above)
3. ~~Connect real accounts in development mode (Phase 2)~~ — done, code-complete; OAuth + cron
   publisher implemented (see "Connections + publishing" above). **Not yet live-tested** — needs the
   owner to register redirect URIs on Meta's/TikTok's own developer dashboards first (see "Manual
   setup" note above), then actually connect an account and schedule a post through to publish.
4. ~~Comment/DM monitoring with approve-then-send replies (Phase 3, Facebook + Instagram only)~~ —
   done, code-complete; webhook signature/challenge verified locally with crafted payloads. **Not yet
   live-tested** — needs deployment (webhooks require a public HTTPS URL to register with Meta), then
   registering the webhook subscriptions and reconnecting accounts with the expanded OAuth scopes (see
   "Comments + replies" above).
5. Submit for Meta App Review (and TikTok's equivalent) once 1–4 are solid — this is the long pole,
   which is why step 3 starts the registration early rather than waiting

## Design decisions not to re-litigate

- No public/anon Supabase access anywhere — everything server-side through the service-role client,
  unlike the quiz app which needed anon access for its public quiz-taking flow.
- Product "pages" means a social post announcing a new product (the simplest option per the brief) —
  not a Commerce/Catalog API integration. Revisit only if shoppable tags are explicitly requested.
- Reply mode is approve-then-send; don't wire up auto-reply without an explicit decision to change this.
