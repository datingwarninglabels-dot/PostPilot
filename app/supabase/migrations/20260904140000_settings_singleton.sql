-- Applied to project zbuliehovticxushbidy via Supabase MCP on 2026-09-04.

-- Single-row app settings. The auto_draft_replies flag is opt-in and defaults
-- to false — the app never drafts replies on its own until the owner turns it on.
create table if not exists public.settings (
  id boolean primary key default true,
  auto_draft_replies boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = true)
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

alter table public.settings enable row level security;
