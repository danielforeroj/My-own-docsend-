alter table public.documents add column if not exists landing_page jsonb not null default '{}'::jsonb;
alter table public.spaces add column if not exists landing_page jsonb not null default '{}'::jsonb;
alter table public.share_links add column if not exists intake_settings jsonb not null default '{}'::jsonb;

alter table public.share_link_fields
  add column if not exists help_text text,
  add column if not exists default_value text,
  add column if not exists width text not null default 'full',
  add column if not exists validation_rule text;

update public.share_link_fields set width = 'full' where width is null;

alter table public.share_link_fields
  add constraint share_link_fields_width_check check (width in ('full','half'));
