# Internal DocSend MVP Foundation

Lean internal DocSend-style platform foundation built with:
- Next.js App Router + TypeScript + Tailwind
- Supabase (Auth, Postgres, Storage)
- Resend (transactional email)

## Implemented in this step

- Protected admin app at `/admin`
- Role model foundation (`super_admin`, `admin`) via `memberships.role`
- Core database schema SQL migrations
- Admin shell pages:
  - Dashboard
  - Documents (+ detail analytics)
  - Spaces (+ detail analytics)
  - Share Links
  - Analytics
  - Settings
- PDF document uploads to Supabase Storage bucket `documents`
- Document metadata persistence to `documents` table
- Basic Spaces CRUD + document assignment
- Public share links for both Documents and Spaces
- Per-share-link configurable intake fields
- Public intake form rendering + validation
- Gated public access until intake completion
- Document viewer and Space viewer
- Analytics tracking stored internally in Postgres:
  - views (`view_sessions`)
  - downloads (`downloads`)
  - form leads (`visitor_submissions`)
  - unique viewers (based on distinct visitor submission ids)
- New lead notification email via Resend (optional env-driven)

## Local setup

1. Install dependencies

```bash
npm install
```

2. Copy env file

```bash
cp .env.example .env.local
```

3. Fill env vars from Supabase project settings (and Resend if using notifications).

4. Run dev server

```bash
npm run dev
```

## Supabase manual setup

1. Create a Supabase project.
2. In SQL editor, run migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_public_share_links.sql`
3. Create storage bucket:
   - Name: `documents`
   - Public: `false`
4. Create your first auth user (email/password) from Supabase Auth.
5. Seed org + membership (replace placeholders):

```sql
insert into public.organizations (name, created_by)
values ('My Agency', 'YOUR_USER_ID')
returning id;

insert into public.memberships (organization_id, user_id, role)
values ('ORG_ID_FROM_ABOVE', 'YOUR_USER_ID', 'super_admin');

insert into public.profiles (id, full_name)
values ('YOUR_USER_ID', 'Founding Admin')
on conflict (id) do update set full_name = excluded.full_name;
```

6. Sign in at `/admin/login` using that user.
7. Upload documents, create spaces, then create share links from Documents/Spaces pages.

## Resend setup (optional)

If set, each successful intake form submission triggers a lead notification email.

Required env vars:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEAD_NOTIFICATION_EMAIL`

If any are missing, notifications are skipped safely.

## Notes

- This is intentionally minimal for MVP speed.
- Public share URLs are served at `/s/:token`.
- Intake field types supported: `text`, `email`, `phone`, `textarea`, `select`, `checkbox`.
- Download tracking uses `/s/:token/download/:documentId` so download events are persisted before redirecting to signed URLs.
