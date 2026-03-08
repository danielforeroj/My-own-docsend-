alter table public.view_sessions
  add column if not exists viewer_fingerprint text;

create index if not exists idx_view_sessions_viewer_fingerprint on public.view_sessions(viewer_fingerprint);
create index if not exists idx_view_sessions_created_at on public.view_sessions(created_at desc);

-- Legacy table replaced by share_link_fields.
drop table if exists public.intake_field_configs;
