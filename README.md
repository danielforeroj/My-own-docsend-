# Internal DocSend MVP

DocSend-style internal sharing app built with **Next.js App Router + TypeScript + Tailwind + Supabase + optional Resend**, designed to deploy on **Vercel**.

## Architecture (current)

- **Admin app**: `/admin/*`
  - Login, dashboard, documents, spaces, share links, analytics, settings.
- **Public catalog homepage**: `/`
  - Shows only public items allowed in catalog.
  - Separates spaces and documents, with featured items first when available.
- **Public slug routes**: `/docs/[slug]`, `/spaces/[slug]`
  - Only resolve items marked `visibility=public` with a valid `public_slug`.
- **Private/share routes**: `/s/:token`
  - Supports document links and space links.
  - Optional intake gate with custom fields.
  - Works for private sharing flows independent of catalog visibility.
- **Storage**: Supabase Storage bucket `documents` (private).
  - PDFs upload directly from browser to Storage using short-lived signed upload URL.
- **DB**: Supabase Postgres tables for organizations, docs, spaces, share links, intake submissions, views/downloads.
- **Email (optional)**: Resend for lead notifications.

---

## Runtime modes and environment variables

### Demo mode (safe pre-Supabase setup)

Use demo mode when you want the app to boot and render key routes before wiring Supabase.

Required:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `NEXT_PUBLIC_SITE_URL`

Notes:

- `/` and `/admin/login` render safely without Supabase values.
- Middleware will not hard-block `/admin` in demo mode.
- Admin auth/data features still require Supabase and are not mocked in this PR.

Demo preview behavior:

- Read-only pages render from built-in mock repository data (documents, spaces, share links, analytics, settings, and public share pages).
- Mutating actions are disabled/no-op in demo mode so UI flows do not crash.
- Demo share links available out of the box: `/s/demo-document` and `/s/demo-space`.


### Connected mode (full Supabase runtime)

Use connected mode for real auth/data behavior.

Required:

- `NEXT_PUBLIC_DEMO_MODE=false` (or unset)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Optional (lead notification emails):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEAD_NOTIFICATION_EMAIL`

Use `.env.example` as a starting point.

---

## Workflows

### Demo mode workflow (no Supabase required)

1. Set `NEXT_PUBLIC_DEMO_MODE=true`.
2. Start the app.
3. Review public catalog (`/`), public slug routes (`/docs/[slug]`, `/spaces/[slug]`), and admin preview routes.
4. Mutating actions are disabled/no-op in demo mode by design.

### Connected Supabase workflow

1. Set `NEXT_PUBLIC_DEMO_MODE=false` (or unset).
2. Configure Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Run migrations (including visibility/public slug migration).
4. Use admin pages to configure visibility and slugs per item.

### Public vs private content behavior

- `visibility=public` + `show_in_catalog=true` + `public_slug` => shown on homepage catalog and accessible via slug route.
- `visibility=private` => never listed on homepage or slug routes.
- Private items can still be shared through private/share-link flows (`/s/[token]`).

### Route map

- `/` — public catalog
- `/docs/[slug]` — public document page
- `/spaces/[slug]` — public space page
- `/s/[token]` — private/share link experience (intake-aware)
- `/admin/*` — admin app

---

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Supabase setup (exact)

1. Create a Supabase project.
2. Run SQL migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_public_share_links.sql`
   - `supabase/migrations/0003_branding_and_landing.sql`
   - `supabase/migrations/0004_upload_and_analytics_cleanup.sql`
   - `supabase/migrations/0005_visibility_and_public_slugs.sql`
3. Create Storage bucket:
   - Name: `documents`
   - Public: `false` (private)
4. Create first admin user in Supabase Auth (email/password).
5. Seed org + membership for that user:

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

---

## Vercel deployment (default flow)

1. Push repo to GitHub.
2. Import project in Vercel.
3. Set framework preset to Next.js (default).
4. Add env vars in Vercel Project Settings:
   - `NEXT_PUBLIC_DEMO_MODE` (set `false` for connected mode, `true` for demo mode)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (set to your production URL)
   - Optional Resend vars.
5. Deploy.
6. (Optional) add custom domain and update `NEXT_PUBLIC_SITE_URL`.

No additional infra/services required.

---

## Manual setup checklist

### Supabase
- [ ] Migrations 0001 → 0004 applied
- [ ] Private `documents` bucket exists
- [ ] At least one Auth user exists
- [ ] Org + membership seed SQL executed

### Vercel
- [ ] `NEXT_PUBLIC_DEMO_MODE` set correctly for your deployment mode
- [ ] All required env vars configured for connected mode
- [ ] Production deployment succeeds
- [ ] `NEXT_PUBLIC_SITE_URL` matches production domain

---

## Current MVP limitations

- No antivirus/virus scanning on uploaded PDFs.
- Intake success UI is a simple post-submit banner.
- View deduping is fingerprint/time-window based (best-effort, not perfect identity).
- No background jobs/queues; all behavior is request-time MVP logic.
