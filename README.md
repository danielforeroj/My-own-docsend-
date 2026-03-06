# Internal DocSend MVP Foundation

Lean internal DocSend-style platform foundation built with:
- Next.js App Router + TypeScript + Tailwind
- Supabase (Auth, Postgres, Storage)
- Resend placeholder for later email flows

## Implemented in this step

- Protected admin app at `/admin`
- Role model foundation (`super_admin`, `admin`) via `memberships.role`
- Core database schema SQL migrations
- Admin shell pages:
  - Dashboard
  - Documents
  - Spaces
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
- Document viewer (signed URL iframe)
- Space viewer (documents list with signed links)
- Captured form submissions persisted in `visitor_submissions`

## Local setup

1. Install dependencies

```bash
npm install
```

2. Copy env file

```bash
cp .env.example .env.local
```

3. Fill env vars from Supabase project settings.

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

## Notes

- This is intentionally minimal for MVP speed.
- Public share URLs are served at `/s/:token`.
- Intake field types supported: `text`, `email`, `phone`, `textarea`, `select`, `checkbox`.
- If intake is required on a share link, visitors must submit form data before access.
