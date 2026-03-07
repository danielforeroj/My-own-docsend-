import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: org }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", ctx.organizationId).maybeSingle(),
    supabase.from("memberships").select("role, user_id").eq("organization_id", ctx.organizationId).order("created_at", { ascending: true })
  ]);

  const resendReady = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.LEAD_NOTIFICATION_EMAIL);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Configuration</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Organization</h2>
        <p className="text-sm text-muted-foreground">Name: {org?.name ?? "Not found"}</p>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">Branding placeholders</h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Primary color: <code>configured in app/globals.css tokens</code></p>
          <p>Logo URL: <code>configure per Space/Document landing config</code></p>
          <p>Public app domain: <code>docs.multipliedhq.com</code> (planned)</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">Email notifications (Resend)</h2>
        <p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{resendReady ? "Configured" : "Missing env vars"}</span></p>
        <p className="mt-2 text-xs text-muted-foreground">Required env: RESEND_API_KEY, RESEND_FROM_EMAIL, LEAD_NOTIFICATION_EMAIL.</p>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">Members</h2>
        <ul className="space-y-1 text-sm">
          {members?.map((member) => (
            <li key={member.user_id}>{member.user_id} — <span className="font-medium">{member.role}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
