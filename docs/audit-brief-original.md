# PostPilot Audit & Improvement Prompt (for Claude Code)

## PostPilot Context — read this before starting

PostPilot is a custom social media automation system (Next.js, deployed on Vercel at
postpilot-taupe-gamma.vercel.app) that connects to Facebook, Instagram, and TikTok. It:

- Drafts social posts using the Gemini API
- **Requires human approval before anything publishes** — this is the core design
  principle and the main thing differentiating it from riskier "autonomous agent"
  products. It must not be weakened, bypassed, or made optional by default anywhere
  in this audit.
- Monitors comments/DMs via webhooks (Facebook feed/messages, Instagram
  comments/messages) and is being built out to draft/send replies
- Manages **multiple brand pages** simultaneously: Facebook Pages "Hot Flashes &
  Unfiltered" and "The Raw Truth Project," Instagram "therawtruthproject," and a
  TikTok presence for the Dating Warning Labels project — so any UI/UX audit should
  account for multi-property use, not a single account

**Non-negotiable constraint for this audit:** nothing that publishes to a real platform
(a post, a comment reply, a DM) may go live without an explicit human approval step,
now or after any change made during this audit. If a proposed improvement would relax
that, flag it instead of implementing it.

**Known priority already agreed on:** build a full activity/audit log first — every
draft, edit, approval, publish attempt, and its success/fail status, across all
connected accounts — before adding anything else. Treat this as P0 alongside actual
bugs, even though the base template below files logging under P1/trust work.

---

## 1. AUDIT THE CURRENT APP FIRST

Before making changes, inspect the entire application.

Review:

- Every page and screen
- Navigation
- User flows — **especially the draft → approve → publish flow, and the
  comment/DM → draft reply → approve → send flow**
- Forms
- Buttons and calls-to-action
- Authentication and onboarding
- Dashboard
- Mobile responsiveness
- Empty states
- Loading states
- Error states
- Success messages
- Search/filtering
- Settings
- Account/profile areas — **including the /connections page across Facebook,
  Instagram, and TikTok**
- Database interactions
- APIs and integrations — **note where webhook or OAuth failures fail silently
  vs. surface clearly**
- Accessibility
- Performance
- Security basics — **flag anywhere a secret, token, or webhook verify token could
  be exposed client-side**
- SEO and metadata for public pages
- Existing analytics/events
- Overall visual consistency

Identify:

1. What already works well
2. What feels mediocre
3. What feels confusing
4. What looks unfinished
5. What is unnecessarily complicated
6. What is missing — **explicitly check: is there any audit trail of what was
   posted/sent and when? If not, this is the top gap.**
7. What could cause users to abandon the app
8. What could reduce trust
9. What could prevent conversion
10. Bugs, broken links, dead buttons, placeholder content, and incomplete features

Create a prioritized improvement plan before making major changes.

## 2. IMPROVE THE PRODUCT EXPERIENCE

Make the app extremely easy to understand.

A first-time visitor (or a returning user checking in each morning) should quickly
understand:

- What's pending their approval right now
- What already went out, and how it performed
- What needs their attention (a failed post, an unanswered DM)
- What they should do next

Reduce unnecessary steps and friction in the approval flow specifically — approving
should be fast, but never silent or automatic for publish actions.

Simplify complicated workflows. Use progressive disclosure instead of overwhelming
users with too many options at once.

Every important screen should have one obvious primary action.

Make navigation predictable and consistent across brand pages.

Do not add features merely to make the app appear more advanced. Every feature must
solve a real user problem.

## 3. UPGRADE THE UI

Transform the interface into a modern, premium product.

Improve: typography, font hierarchy, spacing, alignment, layout, cards, buttons,
forms, inputs, icons, navigation, modals, tables, mobile layouts, visual hierarchy,
color usage, contrast, hover states, focus states, active states, disabled states,
loading states, empty states, error states.

Create a consistent design system rather than styling individual pages randomly.

Use consistent border radiuses, shadows, spacing, button sizes, input heights,
typography, icons, containers, breakpoints.

Avoid the generic "AI-generated website" appearance. Do NOT overuse huge gradients,
excessive rounded cards, random glassmorphism, giant headings, excessive animations,
emojis as interface icons, unnecessary decorative elements.

The final interface should feel intentionally designed by an experienced product team.

## 4. MAKE IT FEEL ALIVE

Add subtle, useful interaction feedback where appropriate: smooth transitions, button
feedback, hover states, skeleton loaders, progress indicators, toast notifications,
form validation, confirmation messages, helpful empty states, success states, error
recovery, micro-interactions.

**Publish and send actions specifically need unambiguous feedback** — a clear "sent"
or "published" confirmation tied to the actual API response, not just "request
submitted." Animations should improve comprehension, not distract the user.

## 5. IMPROVE THE COPY

Rewrite weak or generic copy. Remove vague language such as "Get Started," "Unlock
Your Potential," "Revolutionize Your Experience," "Next-Level Solution," unless it
genuinely fits the context.

Use specific, human language that explains the value. Buttons should clearly
communicate what happens when clicked — **"Approve & Publish to Instagram" beats
"Confirm."**

Error messages should explain what happened, why (when known), and what the user
should do next.

Empty states should help users take their next action.

## 6. IMPROVE ONBOARDING

A new user (or a new brand page being connected) should reach the app's core value as
quickly as possible.

Review the complete journey: landing/dashboard → connect a platform → first draft →
first approval → first published post → first result seen.

Remove unnecessary steps. Where appropriate: provide examples, pre-fill sensible
defaults, add contextual guidance, show progress, allow users to skip optional steps.

Optimize for time to value — but never at the cost of the approval step.

## 7. MAKE THE APP MOBILE-FIRST

Test every major screen at small phone, large phone, tablet, laptop, desktop sizes.

Fix overflow, tiny tap targets, broken grids, oversized text, awkward navigation,
forms that are difficult on mobile, modals that exceed the viewport, horizontal
scrolling, poor spacing.

**Approving a post from a phone should be a one-thumb operation** — this is likely
where approvals actually happen day to day.

## 8. IMPROVE TRUST

Look for anything that makes the product appear unfinished or questionable.

Fix placeholder text, fake-looking testimonials, inconsistent branding, broken pages,
dead links, missing policies, confusing pricing, unclear payment language, missing
confirmation messages, poor error handling, unprofessional copy, inconsistent design.

**Build the activity/audit log here if it doesn't exist yet.** Every draft, edit,
approval, publish attempt, and reply — timestamped, with clear success/fail status,
searchable and exportable, across every connected account. This is the single
highest-leverage trust feature: it should always be possible to answer "did that
actually go out, and when" without checking each platform by hand.

Do not fabricate customers, statistics, testimonials, reviews, certifications, or
partnerships.

## 9. IMPROVE CONVERSION

Not applicable in the traditional sense — PostPilot isn't selling itself to strangers.
Instead, optimize the "did this help the business" loop: make it easy to see whether
approved posts are actually driving engagement, so time spent approving feels
worthwhile.

## 10. PERFORMANCE

Audit and improve page load speed, image sizes, lazy loading, unnecessary JavaScript,
duplicate requests, database queries, rendering, caching opportunities, bundle size,
fonts, API calls.

**Check for Gemini API and platform rate-limit handling** — surface usage/quota
status somewhere visible rather than letting a draft silently fail when a limit is
hit.

Do not sacrifice maintainability for tiny performance gains.

## 11. ACCESSIBILITY

Improve accessibility throughout: keyboard navigation, focus indicators, color
contrast, form labels, semantic HTML, screen-reader compatibility, alt text, ARIA only
where necessary, tap-target sizes, error identification. Aim for WCAG 2.2 AA where
practical.

## 12. ERROR-PROOF THE EXPERIENCE

Users should never wonder "did that work?" — **this applies most critically to
publish actions and reply-sends.**

Handle network failures, API failures, invalid input, duplicate submissions, slow
responses, empty data, unauthorized access, expired sessions (OAuth token expiry for
Facebook/Instagram/TikTok), missing records.

**Never silently fail — a failed publish must show up as failed, not disappear from
the queue.** This was one of the biggest trust failures in a competitor product we
reviewed (Polsia): tasks marked "complete" that never actually deployed. Don't repeat
that pattern.

## 13. REVIEW THE TECHNICAL QUALITY

Inspect the codebase for duplicate code, fragile components, hardcoded values, dead
code, console errors, poor state management, missing validation, missing error
handling, security problems, exposed secrets (**check META_APP_SECRET,
META_WEBHOOK_VERIFY_TOKEN, INSTAGRAM_WEBHOOK_VERIFY_TOKEN, and Gemini API key are only
ever read server-side**), poor database patterns, unnecessary dependencies,
inconsistent architecture.

Refactor where the benefit is meaningful. Do not perform large rewrites merely for
stylistic reasons.

## 14. DO NOT BREAK WORKING FEATURES

Before changing important functionality:

1. Understand how it currently works.
2. Identify dependencies.
3. Preserve existing data and behavior unless there is a strong reason to change it.
4. Make incremental improvements.
5. Test after each significant change.

**Explicitly protected, do not weaken or bypass under any circumstance:**
- The requirement that a human approves a post before it publishes
- The requirement that a human approves a reply before it sends (once that feature
  ships)
- Existing OAuth connections for Facebook, Instagram, and TikTok
- Existing webhook subscriptions and verify tokens

Do not remove existing features without explaining why. Do not modify production
infrastructure, domains, DNS, live payments, production databases, secrets, or
destructive data operations without explicit approval.

## 15. TEST EVERYTHING

After improvements, test the major user journeys end-to-end: sign up, sign in, sign
out, account flows, navigation, forms, CRUD operations, search, filtering, **the full
draft → approve → publish flow on each connected platform**, **the comment/DM →
draft reply → approve → send flow**, mobile and desktop layouts, error states, empty
states, permissions, links, buttons.

Run the project's available build, type checks, lint, and tests. Fix errors caused by
your changes.

## 16. THINK LIKE A USER

For every screen, ask: "What does the user want to accomplish here?" Then make that
action obvious. Remove anything that competes unnecessarily with that goal.

## 17. PRIORITIZE IMPROVEMENTS

Use this order, with the PostPilot-specific additions folded in:

- **P0** — Broken functionality, security issues, data-loss risks, **and the
  activity/audit log if it doesn't exist yet**
- **P1** — Major usability problems and confusing workflows, **silent-failure
  handling on publish/send actions**
- **P2** — Onboarding, conversion, and retention improvements, **daily digest view
  (built on top of the P0 audit log)**
- **P3** — Visual polish and consistency, **multi-brand dashboard/switcher**
- **P4** — Delight, animations, and optional enhancements, **platform-accurate post
  previews, opt-in auto-reply for routine comments (approval-gated, never default-on)**

Do not spend hours polishing animations while fundamental UX problems remain.

---

## FINAL QUALITY BAR

The finished app should feel professional, modern, fast, clear, trustworthy,
cohesive, responsive, accessible, and easy to check in on for two minutes each
morning. The standard: "Would I trust this enough to let it run my business's public
voice across three platforms, and know exactly what it did each day?"

## FINAL DELIVERABLE

When finished, provide:

1. What was wrong with the original app
2. What you changed
3. Major UX improvements
4. Major UI improvements
5. Technical improvements
6. Bugs fixed
7. Performance/accessibility improvements
8. Tests/checks performed
9. Anything that still needs attention
10. Recommended next improvements ranked by impact
