alter table public.documents
  add column if not exists visibility text not null default 'private',
  add column if not exists public_slug text,
  add column if not exists show_in_catalog boolean not null default false;

alter table public.spaces
  add column if not exists visibility text not null default 'private',
  add column if not exists public_slug text,
  add column if not exists show_in_catalog boolean not null default false;

alter table public.documents
  add constraint documents_visibility_check check (visibility in ('public','private'));

alter table public.spaces
  add constraint spaces_visibility_check check (visibility in ('public','private'));

create unique index if not exists idx_documents_public_slug_unique on public.documents(public_slug) where public_slug is not null;
create unique index if not exists idx_spaces_public_slug_unique on public.spaces(public_slug) where public_slug is not null;
