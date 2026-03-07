# Internal DocSend MVP

Lean internal DocSend-style platform for agencies/projects using:
- Next.js App Router + TypeScript + Tailwind
- Supabase (Auth + Postgres + Storage)
- Resend (transactional email notifications)
- Vercel (deployment)

---

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` values.
4. Start local app:

```bash
npm run dev
```

5. Optional verification:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Supabase setup

1. Create a Supabase project.
2. Run SQL migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_public_share_links.sql`
3. Create Storage bucket:
   - Name: `documents`
   - Public: `false`
4. Create first admin user in Supabase Auth (email/password).
5. Seed initial organization + membership:

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

6. Login at `/admin/login`.

### Current analytics tracking (internal DB only)

Analytics is persisted to your own Supabase database (no PostHog/third-party analytics):
- `view_sessions`: views + recent visits + per-document/per-space counts
- `downloads`: tracked downloads from `/s/:token/download/:documentId`
- `visitor_submissions`: captured intake leads

---

## Resend setup

Resend is used for **new lead notification** emails after intake submissions.

Required env vars:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEAD_NOTIFICATION_EMAIL`

Behavior:
- If all three vars are set, lead notification emails are sent.
- If any are missing, email sending is skipped safely (no crash).

---

## Deploy to Vercel

1. Push repo to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Set framework to **Next.js** (auto-detected).
4. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (use production URL)
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `LEAD_NOTIFICATION_EMAIL`
5. Deploy.
6. After deploy, set `NEXT_PUBLIC_SITE_URL` to your production domain and redeploy.

---

## Namecheap DNS setup for `docs.multipliedhq.com`

When your Vercel project is ready:

1. In Vercel, add domain: `docs.multipliedhq.com`.
2. In Namecheap DNS for `multipliedhq.com`, create:
   - `CNAME` record
   - Host: `docs`
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic
3. Wait for DNS propagation.
4. Verify domain status in Vercel becomes valid.
5. Ensure `NEXT_PUBLIC_SITE_URL=https://docs.multipliedhq.com`.

---

## Remaining non-blocking follow-ups

- Add pagination for large analytics datasets.
- Improve unique viewer logic with optional anonymized IP/device fingerprinting.
- Add admin controls for link expiry and revoke access grants.
- Add richer branding settings persisted in DB (logo, colors, sender name).
- Add E2E smoke tests for share-link intake + tracked downloads.
