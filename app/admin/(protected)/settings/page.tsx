import { createEmployeeUserActionState } from "@/app/admin/actions";
import { FormFieldError, ServerActionForm } from "@/components/ui/server-action-form";
import { requireAdminContext } from "@/lib/auth/server";
import { getSettingsData } from "@/lib/data/repository";
import { isResendConfigured } from "@/lib/runtime";

export default async function SettingsPage() {
  const ctx = await requireAdminContext();
  const data = await getSettingsData(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Configuration</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage organization settings, team members, and admin access.</p>
        {data.source === "demo" ? <p className="mt-2 text-xs text-yellow-300">Demo mode: settings are preview-only.</p> : null}
      </div>

      <section className="card p-5"><h2 className="font-semibold">Organization</h2><p className="text-sm text-muted-foreground">Name: {data.organizationName}</p></section>
      <section className="card p-5"><h2 className="mb-2 font-semibold">Branding placeholders</h2><div className="space-y-1 text-sm text-muted-foreground"><p>Primary color: <code>{data.branding?.primaryColor ?? "configured in app/globals.css tokens"}</code></p><p>Logo URL: <code>{data.branding?.logoUrl ?? "configure per Space/Document landing config"}</code></p><p>Public app domain: <code>docs.multipliedhq.com</code> (planned)</p></div></section>
      <section className="card p-5"><h2 className="mb-2 font-semibold">Email notifications (Resend)</h2><p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{isResendConfigured() ? "Configured" : "Not configured (optional)"}</span></p><p className="mt-2 text-xs text-muted-foreground">Required env: RESEND_API_KEY, RESEND_FROM_EMAIL, LEAD_NOTIFICATION_EMAIL.</p></section>

      {ctx.role === "super_admin" ? (
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">Create employee user</h2>
          <p className="mb-3 text-sm text-muted-foreground">Creates auth user access and syncs profile + membership for this organization.</p>
          <ServerActionForm action={createEmployeeUserActionState} className="grid gap-3 md:grid-cols-2" idleLabel="Create user" pendingLabel="Creating user..." submitClassName="btn-primary md:col-span-2">
            {(state) => (
              <>
                <div className="space-y-1 md:col-span-2">
                  <label className="label">Full name</label>
                  <input name="full_name" type="text" className="w-full" required />
                  <FormFieldError state={state} name="full_name" />
                </div>
                <div className="space-y-1">
                  <label className="label">Email</label>
                  <input name="email" type="email" className="w-full" required />
                  <FormFieldError state={state} name="email" />
                </div>
                <div className="space-y-1">
                  <label className="label">Temporary password</label>
                  <input name="password" type="password" minLength={8} className="w-full" required />
                  <FormFieldError state={state} name="password" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="label">Role</label>
                  <select name="role" defaultValue="admin" className="w-full">
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </div>
              </>
            )}
          </ServerActionForm>
        </section>
      ) : null}

      <section className="card p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Members</h2>
          <span className="text-xs text-muted-foreground">{data.members.length} total</span>
        </div>
        {!data.members.length ? <p className="text-sm text-muted-foreground">No members found for this organization.</p> : null}
        <ul className="space-y-2 text-sm">
          {data.members.map((member) => {
            const fullName = "fullName" in member ? member.fullName : null;
            const email = "email" in member ? member.email : null;
            return (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="font-medium">{fullName ?? "Unnamed user"}</p>
                <p className="text-xs text-muted-foreground">{email ?? member.userId}</p>
              </div>
              <span className="rounded-full bg-background px-2 py-1 text-xs capitalize text-muted-foreground">{member.role}</span>
            </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
