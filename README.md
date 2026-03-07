# Internal DocSend MVP

Internal/proprietary DocSend-style platform built with:
- Next.js App Router + TypeScript + Tailwind
- Supabase (Auth, Postgres, Storage)
- Resend (optional transactional emails)

## What exists now

- Admin app at `/admin` with:
  - Dashboard
  - Documents (upload/list/detail)
  - Spaces (list/create/edit/detail)
  - Share Links (create/configure)
  - Analytics
  - Settings
- Public share pages at `/s/:token`
- Intake form gating with access grants
- Tracked view/download/submission analytics stored in Supabase tables
- Structured landing-page customization for both documents and spaces
- System dark/light theme via centralized tokens in `app/globals.css`

---

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Optional checks:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Supabase setup

1. Create a Supabase project.
2. Run migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_public_share_links.sql`
   - `supabase/migrations/0003_branding_and_landing.sql`
3. Create storage bucket:
   - Name: `documents`
   - Public: `false`
4. Create first admin user in Supabase Auth.
5. Seed org + membership:

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

## Resend setup (optional)

Used for new lead notifications on intake submission.

Required env vars:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEAD_NOTIFICATION_EMAIL`

If not set, email sending is safely skipped.

---

## Theme tokens (brand control)

All major color tokens are centralized in `app/globals.css`:
- background
- foreground
- muted
- card
- border
- primary
- secondary
- success
- warning
- danger

Update brand/accent colors there to apply globally.

---

## Deployment notes

- Deploy app to Vercel
- Supabase remains DB/Auth/Storage backend
- Point `docs.multipliedhq.com` DNS later to Vercel
- Set `NEXT_PUBLIC_SITE_URL` to production URL in Vercel env

---

## Next step follow-ups (non-blocking)

- Add drag-and-drop field ordering in admin (currently order is by row)
- Add visual preview for landing-page variants inside admin
- Add richer CTA behaviors (inline modal, routed CTA types)
- Add more robust per-field validation presets beyond regex
- Add file/image upload helper for landing hero/logo assets
