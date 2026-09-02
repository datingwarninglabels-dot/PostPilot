-- Applied to project zbuliehovticxushbidy via Supabase MCP on 2026-09-02.
-- Kept here for record-keeping (the project isn't linked for `supabase db push` yet).

-- Append-only audit trail of every draft / edit / approval / publish attempt / reply,
-- across all connected accounts. Service-role only (RLS on, no policies), matching
-- the other four tables. Nothing here is ever updated or deleted by the app.
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- who caused the event: the admin email, or 'system:cron' / 'system:webhook'
  actor text,
  -- draft_generated | post_edited | post_media_set | post_approved | post_rejected
  -- | post_scheduled | post_unscheduled | post_publish_attempt
  -- | reply_generated | reply_edited | reply_approved | reply_rejected | reply_send_attempt
  -- | comment_received | connection_added | connection_removed
  event_type text not null,
  entity_type text not null check (entity_type in ('post','reply','comment','connection')),
  entity_id uuid,
  platform text check (platform in ('facebook','instagram','tiktok')),
  -- denormalised so the log still reads correctly after a connection is disconnected
  account_name text,
  status text not null check (status in ('success','failure','info')),
  summary text,
  -- error message, platform post/reply id, before/after content, etc.
  detail jsonb,
  target_platform_id text
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index if not exists activity_log_event_type_idx on public.activity_log (event_type);
create index if not exists activity_log_platform_idx on public.activity_log (platform);

alter table public.activity_log enable row level security;

-- Which connected account a post publishes to. Previously the publisher picked an
-- arbitrary row for the platform, which is wrong when several Pages/accounts of the
-- same platform are connected. ON DELETE SET NULL so disconnecting an account does
-- not delete post history; the publisher then fails the post with a clear message.
alter table public.posts
  add column if not exists connection_id uuid references public.platform_connections(id) on delete set null;

-- TikTok's publish API only *accepts* a video for async processing; the app does not
-- yet poll for the final result. 'submitted' records that honestly instead of
-- claiming 'published'.
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check
  check (status = any (array['draft','approved','rejected','scheduled','submitted','published','failed']));
