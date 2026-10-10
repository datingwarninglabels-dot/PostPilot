# Audit status

Tracks progress against `docs/audit-brief-original.md` / `docs/audit-brief-refined.md`. For how
each feature actually works, see `CLAUDE.md` — this file is the scannable "what's done, what
isn't" summary; CLAUDE.md has the technical detail.

## Done (P0 → P4, two follow-up audit passes, domain setup)

All pushed to `master` on GitHub (`datingwarninglabels-dot/PostPilot`), deployed to production
(`postpilot-taupe-gamma.vercel.app`) multiple times. Commits referenced are on `master`.

- **P0 — audit/activity log, multi-brand correctness, silent-failure fixes** (`f99aa6a`): append-only
  `activity_log` table + `/activity` view (filters, CSV export); `posts.connection_id` so a post
  targets a specific connected account instead of an arbitrary one when several Pages/accounts of
  the same platform are connected; every Server Action returns a typed result instead of throwing.
- **P1 — error surfacing** (`f99aa6a`, `adc32d7`): toast system, failed-post error shown inline with
  a Retry button, connection token-expiry warnings, AI-provider quota/rate-limit messages mapped to
  plain language.
- **P2 — retention** (`d6e3861`): `/history` ("what went out") feed; first-run onboarding guide.
- **P3 — design system** (`d6e3861`): design tokens, shared UI primitives, mobile-first layouts,
  accessibility pass (focus states, labels, skip link), multi-brand account switcher.
- **P4** (`6ab7efb`): TikTok publish-status polling (`submitted` → `published`/`failed`), mobile
  hamburger nav, platform-accurate post previews.
- **Audit pass 2** (`9dfd009`, `151c14d`): OAuth token auto-refresh (TikTok tokens die in ~24h and
  were never refreshed — this was a real bug), request-level query caching, centralized Graph API
  version constant, webhook JSON-parse hardening, rewritten Privacy/Terms pages (dropped the
  "placeholder" language, disclosed what's actually collected).
- **Engagement metrics on `/history`** (`46dd189`, `b0f6b66`): live like/comment/share counts from
  Facebook and Instagram, tested against real posts in production. Reach/impressions need scopes
  not yet granted — see "Known gaps" below.
- **Opt-in auto-draft replies** (`b0f6b66`): drafts (never sends) a reply to DMs and comments matching
  simple rules, off by default, toggle on `/connections`. Verified end-to-end against production.
- **Data Deletion Instructions page** (`b8144ec`): added by the account owner for Meta App Review.
- **Custom domain `postpilot.xyz`** (`cb272c0`): added to the Vercel project, `www` redirect
  configured, `APP_BASE_URL` pointed at it. **Not actually live yet — see Known gaps.**

## Known gaps / outstanding

1. **`postpilot.xyz` DNS is not configured.** As of 2026-10-10 the domain still resolves to the
   Afternic "parking" page, not the app. Needs, at whatever controls DNS for the domain (likely a
   GoDaddy account, since the domain was bought via Afternic):
   ```
   A      @      76.76.21.21
   CNAME  www    cname.vercel-dns.com
   ```
   (or switch nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`). Until this resolves *and*
   the platform dashboards below are updated, OAuth only works on the vercel.app host.
2. **Platform dashboards need the `postpilot.xyz` redirect URIs added** (owner-only, once DNS
   resolves): Meta app OAuth + webhook callback, Instagram app OAuth + webhook callback, TikTok app
   OAuth callback, Supabase Auth redirect allowlist.
3. **Engagement insights scopes not granted**: `read_insights` (Facebook reach), expired/not
   present `instagram_business_manage_insights` (Instagram reach — confirmed permission error live),
   `video.list` (TikTok — no TikTok account connected to test). Scopes are already requested in the
   OAuth flows; existing connections need reconnecting via `/connections` once DNS/dashboards are
   sorted.
4. **`PUBLISH_DRY_RUN` safety valve was left half-wired** (found 2026-10-10): `lib/publish.ts` and
   `app/src/app/actions.ts` had a complete, working implementation sitting uncommitted; `app/src/app/
   api/cron/publish/route.ts` had two syntax errors (a truncated ternary, and stray text pasted
   into the file) that would have broken the build. Status: being fixed.
5. Real engagement/reach rollups depend on #3.
6. The `docs/audit-brief-refined.md` tightened brief hasn't been worked through as its own pass —
   most of its content overlaps what's already done above; anything in it not reflected here is
   still open.

## Not started

- Platform-accurate post previews beyond the basic mockup (refined brief, P4-ish)
- Any deeper SEO/metadata work once the custom domain is actually live
