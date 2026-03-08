# Internal DocSend MVP

This project runs in two modes:

1. **Demo/frontend mode** (no Supabase/Resend needed)
2. **Connected mode** (Supabase enabled for auth/data/storage + optional Resend)

Stack stays: Next.js App Router, TypeScript, Tailwind, Supabase, Resend, Vercel.

## Runtime mode switching

- `NEXT_PUBLIC_DEMO_MODE=true` forces demo mode.
- If Supabase env vars are missing, app also falls back to demo-safe behavior.
- If Supabase env vars are present and demo flag is not true, app uses connected mode.

Runtime helpers live in `lib/runtime.ts`.

## Env vars

### Optional in demo mode

- `NEXT_PUBLIC_DEMO_MODE` (`true` recommended for local frontend-only preview)
- `NEXT_PUBLIC_SITE_URL`
- Resend vars (all optional)

### Required for connected mode

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Optional (connected mode email notifications)

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEAD_NOTIFICATION_EMAIL`

## What works in demo mode

- Public homepage catalog (`/`) with sample public spaces + docs.
- Public routes for sample content:
  - `/docs/[slug]`
  - `/spaces/[slug]`
- Admin UI preview mode (no auth blocking), including demo login behavior.
- Demo-safe analytics/cards and mock content visibility examples.

## What works only after Supabase is connected

- Real auth/session-based admin access.
- Real document uploads and private storage preview URLs.
- Persistent create/update flows for docs/spaces/share links.
- Real share-link intake, access grants, analytics tracking.

## Public/private visibility model

Documents and spaces now support:

- `visibility`: `public | private`
- `public_slug`: nullable slug for public routes
- `show_in_catalog`: controls homepage listing

Behavior:

- Public + catalog-enabled items appear on `/`.
- Private items are hidden from catalog.
- Share links (`/s/[token]`) continue to support private/gated access.

## Supabase setup (connected mode)

Run migrations in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_public_share_links.sql`
3. `supabase/migrations/0003_branding_and_landing.sql`
4. `supabase/migrations/0004_upload_and_analytics_cleanup.sql`
5. `supabase/migrations/0005_visibility_catalog.sql`

Create private storage bucket:

- name: `documents`
- public: `false`

Seed first org/user membership as needed (same as before).

## Vercel deploy

- Use default Next.js deploy flow.
- Set env vars based on target mode:
  - demo preview: set `NEXT_PUBLIC_DEMO_MODE=true`
  - connected: set Supabase vars and remove/disable demo mode

## Limitations

- Demo data is static mock content.
- In demo mode, backend mutations are preview-only / disabled.
- Viewer uniqueness is best-effort fingerprint dedupe (MVP).
