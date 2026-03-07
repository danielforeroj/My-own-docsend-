create type public.share_link_type as enum ('space', 'document');
create type public.share_field_type as enum ('text', 'email', 'phone', 'textarea', 'select', 'checkbox');

alter table public.share_links
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists link_type public.share_link_type,
  add column if not exists document_id uuid references public.documents(id) on delete cascade,
  add column if not exists name text;

alter table public.share_links alter column space_id drop not null;

update public.share_links sl
set
  organization_id = s.organization_id,
  link_type = 'space'::public.share_link_type
from public.spaces s
where sl.space_id = s.id and sl.organization_id is null;

alter table public.share_links alter column organization_id set not null;
alter table public.share_links alter column link_type set not null;

alter table public.share_links
  add constraint share_links_target_check
  check (
    (link_type = 'space' and space_id is not null and document_id is null)
    or
    (link_type = 'document' and document_id is not null and space_id is null)
  );

create table if not exists public.share_link_fields (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links(id) on delete cascade,
  field_type public.share_field_type not null,
  field_name text not null,
  label text not null,
  is_required boolean not null default false,
  options jsonb,
  placeholder text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.visitor_submissions alter column space_id drop not null;
alter table public.visitor_submissions add column if not exists document_id uuid references public.documents(id) on delete set null;

alter table public.visitor_submissions
  add constraint visitor_submissions_target_check
  check (space_id is not null or document_id is not null);

create table if not exists public.share_link_access_grants (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links(id) on delete cascade,
  visitor_submission_id uuid not null references public.visitor_submissions(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);


alter table public.view_sessions alter column space_id drop not null;
alter table public.view_sessions
  add constraint view_sessions_target_check
  check (space_id is not null or document_id is not null);

create index if not exists idx_share_links_org on public.share_links(organization_id);
create index if not exists idx_share_links_document on public.share_links(document_id);
create index if not exists idx_share_link_fields_link on public.share_link_fields(share_link_id);
create index if not exists idx_access_grants_link on public.share_link_access_grants(share_link_id);
create index if not exists idx_access_grants_token on public.share_link_access_grants(token);

alter table public.share_link_fields enable row level security;
alter table public.share_link_access_grants enable row level security;

create policy "org members manage share_link_fields" on public.share_link_fields
for all using (
  exists (
    select 1
    from public.share_links sl
    where sl.id = share_link_id and public.is_org_member(sl.organization_id)
  )
) with check (
  exists (
    select 1
    from public.share_links sl
    where sl.id = share_link_id and public.is_org_member(sl.organization_id)
  )
);

create policy "org members read access grants" on public.share_link_access_grants
for select using (
  exists (
    select 1
    from public.share_links sl
    where sl.id = share_link_id and public.is_org_member(sl.organization_id)
  )
);

drop policy if exists "org members manage share_links" on public.share_links;
create policy "org members manage share_links" on public.share_links
for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "org members manage intake configs" on public.intake_field_configs;
