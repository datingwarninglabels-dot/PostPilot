# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Product: Social Media Automation System

Lets the owner use Claude to draft product-announcement posts, review/schedule them before they go
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
`ADMIN_EMAIL`, `ANTHROPIC_API_KEY` (Phase 1); `META_APP_ID`/`META_APP_SECRET`,
`TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` (Phase 2, not yet used by any code).

The schema (applied directly via migration, not yet checked into a `supabase/migrations/` folder —
do that whenever `supabase db pull`/`link` gets set up) defines:

- `posts` — `platform` (facebook/instagram/tiktok), `post_type`, `source_product_description` (the
  input used to generate the draft), `content`, `media_urls`, `status`
  (draft/approved/rejected/scheduled/published/failed), `scheduled_at`, `published_at`,
  `platform_post_id`, `error_message`.
- `platform_connections` — OAuth tokens per connected account (Phase 2). `access_token_encrypted`/
  `refresh_token_encrypted` are named to force the point: encrypt at the application layer with a
  server-side secret before insert — this column is ciphertext, not a raw token holder. Nothing writes
  to this table yet.
- `comments` / `replies` — incoming comments/DMs and their drafted/approved replies (Phase 3). Nothing
  writes to these tables yet.

RLS is enabled on all four tables with **no policies** — default-deny as a defense-in-depth backstop,
since the service-role client bypasses RLS entirely and nothing else should ever be querying these
tables.

**Not yet done**: creating the admin user in Supabase Auth (Dashboard → Authentication → Users → Add
user, using `ADMIN_EMAIL`) — there's no public sign-up flow, same as the quiz app. Until that user
exists, `/login` has nothing to authenticate against.

### Content generation (Phase 1, done)

`app/src/lib/generate.ts` — `draftPostContent(platform, productDescription)`, a lazy Anthropic client
(`getClient()`, throws a clear error if `ANTHROPIC_API_KEY` is unset). Uses `claude-opus-5` with
thinking disabled (`effort: "medium"`) — this is a short, non-agentic copywriting call, not worth
paying for reasoning tokens on. Per-platform style guidance (Facebook/Instagram/TikTok tone and length)
lives in `PLATFORM_GUIDANCE` in that file.

`app/src/app/new/page.tsx` — the drafting UI: pick a platform, describe the product, submit. Calls the
`generateDraftAction` Server Action (`app/src/app/actions.ts`), which inserts a new `posts` row with
`status: "draft"` and redirects to the dashboard. **Doesn't touch any social platform API** — pure
drafting, fully testable today with just `ANTHROPIC_API_KEY` and Supabase configured.

### Dashboard (Phase 1, done)

`app/src/app/page.tsx` (the root route, gated) fetches non-published/non-rejected posts via
`listActivePosts()` (`app/src/lib/posts.ts`) and renders `app/src/app/dashboard.tsx` — a client
component listing each post as a card: editable content, Approve/Reject for drafts, and a
datetime-local scheduler for approved posts. All mutations are Server Actions in `app/src/app/
actions.ts` (`updatePostContentAction`, `approvePostAction`, `rejectPostAction`,
`schedulePostAction`/`unschedulePostAction`), each re-running `requireAdmin()` before touching the
service-role client — Server Actions are callable directly, so the proxy-level gate alone isn't
sufficient there either.

**Scheduling right now is inert** — setting `status: "scheduled"` + `scheduled_at` just records intent;
no cron job reads it yet (that's Phase 2, along with the OAuth connections and the Graph/TikTok API
calls needed to actually publish). This matches the brief's Phase 1 scope: "no live posting yet."

### Deployment

Not deployed anywhere yet. `.claude/launch.json` (both at this repo's root and inside `app/`) has a
`social-media-automation-dev` dev-server config on **port 3001** (not 3000) — the sibling
dating-warning-labels-extracted repo's dev server config already claims 3000 at the session root's
`.claude/launch.json`, and the preview tooling resolves configs from that root file first regardless of
which subdirectory's `launch.json` you'd expect it to use.

## Build order (from the brief)

1. ~~Scaffold Next.js + Supabase~~ — done
2. ~~Draft & approve dashboard (Phase 1)~~ — done, code-complete; **not yet live-tested** (no admin user
   created, no `SUPABASE_SERVICE_ROLE_KEY`/`ANTHROPIC_API_KEY` filled in — see Supabase section above)
3. Connect real accounts in development mode (Phase 2) — register Meta + TikTok developer apps
   (**start this now, in parallel** — see "The part that isn't a coding problem" above), implement
   OAuth, implement the cron publisher against `platform_connections`
4. Comment/DM monitoring with approve-then-send replies (Phase 3) — webhook subscriptions, populate
   `comments`/`replies`
5. Submit for Meta App Review (and TikTok's equivalent) once 1–4 are solid — this is the long pole,
   which is why step 3 starts the registration early rather than waiting

## Design decisions not to re-litigate

- No public/anon Supabase access anywhere — everything server-side through the service-role client,
  unlike the quiz app which needed anon access for its public quiz-taking flow.
- Product "pages" means a social post announcing a new product (the simplest option per the brief) —
  not a Commerce/Catalog API integration. Revisit only if shoppable tags are explicitly requested.
- Reply mode is approve-then-send; don't wire up auto-reply without an explicit decision to change this.
