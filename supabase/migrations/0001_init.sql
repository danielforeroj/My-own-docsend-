create extension if not exists "pgcrypto";

create type public.app_role as enum ('super_admin', 'admin');
create type public.intake_field_type as enum (
  'first_name',
  'last_name',
  'email',
  'phone',
  'telegram',
  'company',
  'title',
  'country',
  'free_text',
  'dropdown',
  'checkbox_consent'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_documents (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (space_id, document_id)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  token text not null unique,
  requires_intake boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.intake_field_configs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  field_key public.intake_field_type not null,
  label text not null,
  is_required boolean not null default false,
  options jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.visitor_submissions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  share_link_id uuid references public.share_links(id) on delete set null,
  payload jsonb not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.view_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  visitor_submission_id uuid references public.visitor_submissions(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  visitor_submission_id uuid references public.visitor_submissions(id) on delete set null,
  downloaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_memberships_user on public.memberships(user_id);
create index idx_documents_org on public.documents(organization_id);
create index idx_spaces_org on public.spaces(organization_id);
create index idx_space_documents_space on public.space_documents(space_id);
create index idx_share_links_space on public.share_links(space_id);
create index idx_intake_fields_space on public.intake_field_configs(space_id);
create index idx_submissions_space on public.visitor_submissions(space_id);
create index idx_views_space on public.view_sessions(space_id);
create index idx_downloads_document on public.downloads(document_id);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.documents enable row level security;
alter table public.spaces enable row level security;
alter table public.space_documents enable row level security;
alter table public.share_links enable row level security;
alter table public.intake_field_configs enable row level security;
alter table public.visitor_submissions enable row level security;
alter table public.view_sessions enable row level security;
alter table public.downloads enable row level security;

create function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.memberships m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

create policy "members read own profile" on public.profiles
for select using (id = auth.uid());

create policy "members update own profile" on public.profiles
for update using (id = auth.uid());

create policy "org members can read organizations" on public.organizations
for select using (public.is_org_member(id));

create policy "org members can read memberships" on public.memberships
for select using (public.is_org_member(organization_id));

create policy "org members manage documents" on public.documents
for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "org members manage spaces" on public.spaces
for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "org members manage space_documents" on public.space_documents
for all using (
  exists (
    select 1 from public.spaces s where s.id = space_id and public.is_org_member(s.organization_id)
  )
);

create policy "org members manage share_links" on public.share_links
for all using (
  exists (
    select 1 from public.spaces s where s.id = space_id and public.is_org_member(s.organization_id)
  )
);

create policy "org members manage intake configs" on public.intake_field_configs
for all using (
  exists (
    select 1 from public.spaces s where s.id = space_id and public.is_org_member(s.organization_id)
  )
);

create policy "org members read submissions" on public.visitor_submissions
for select using (
  exists (
    select 1 from public.spaces s where s.id = space_id and public.is_org_member(s.organization_id)
  )
);

create policy "org members read views" on public.view_sessions
for select using (
  exists (
    select 1 from public.spaces s where s.id = space_id and public.is_org_member(s.organization_id)
  )
);

create policy "org members read downloads" on public.downloads
for select using (
  exists (
    select 1 from public.documents d where d.id = document_id and public.is_org_member(d.organization_id)
  )
);
