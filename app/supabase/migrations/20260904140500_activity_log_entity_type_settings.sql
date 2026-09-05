-- Applied to project zbuliehovticxushbidy via Supabase MCP on 2026-09-04.
alter table public.activity_log drop constraint if exists activity_log_entity_type_check;
alter table public.activity_log add constraint activity_log_entity_type_check
  check (entity_type in ('post','reply','comment','connection','settings'));
