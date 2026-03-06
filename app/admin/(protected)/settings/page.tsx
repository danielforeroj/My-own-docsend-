import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: org }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", ctx.organizationId).maybeSingle(),
    supabase
      .from("memberships")
      .select("role, user_id")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: true })
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="font-semibold">Organization</h2>
        <p className="text-sm text-slate-600">Name: {org?.name ?? "Not found"}</p>
      </section>

      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="mb-2 font-semibold">Members</h2>
        <ul className="space-y-1 text-sm">
          {members?.map((member) => (
            <li key={member.user_id}>
              {member.user_id} — <span className="font-medium">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
