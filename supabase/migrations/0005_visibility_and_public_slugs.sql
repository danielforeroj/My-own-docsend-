alter table public.documents
  add column if not exists visibility text not null default 'private' check (visibility in ('public', 'private')),
  add column if not exists public_slug text,
  add column if not exists show_in_catalog boolean not null default false,
  add column if not exists is_featured boolean not null default false;

alter table public.spaces
  add column if not exists visibility text not null default 'private' check (visibility in ('public', 'private')),
  add column if not exists public_slug text,
  add column if not exists show_in_catalog boolean not null default false,
  add column if not exists is_featured boolean not null default false;

create unique index if not exists idx_documents_public_slug_unique
  on public.documents (lower(public_slug))
  where public_slug is not null;

create unique index if not exists idx_spaces_public_slug_unique
  on public.spaces (lower(public_slug))
  where public_slug is not null;

create index if not exists idx_documents_public_catalog
  on public.documents (visibility, show_in_catalog, is_featured, created_at desc);

create index if not exists idx_spaces_public_catalog
  on public.spaces (visibility, show_in_catalog, is_featured, created_at desc);
