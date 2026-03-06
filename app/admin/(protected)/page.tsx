import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ count: documentsCount }, { count: spacesCount }, { data: spaceRows }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", ctx.organizationId),
    supabase.from("spaces").select("id", { count: "exact", head: true }).eq("organization_id", ctx.organizationId),
    supabase.from("spaces").select("id").eq("organization_id", ctx.organizationId)
  ]);

  const spaceIds = spaceRows?.map((s) => s.id) ?? [];

  const [submissions, views, downloads] = await Promise.all([
    spaceIds.length
      ? supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).in("space_id", spaceIds)
      : Promise.resolve({ count: 0 }),
    spaceIds.length
      ? supabase.from("view_sessions").select("id", { count: "exact", head: true }).in("space_id", spaceIds)
      : Promise.resolve({ count: 0 }),
    spaceIds.length
      ? supabase.from("downloads").select("id", { count: "exact", head: true }).in("space_id", spaceIds)
      : Promise.resolve({ count: 0 })
  ]);

  const stats = [
    { label: "Documents", value: documentsCount ?? 0 },
    { label: "Spaces", value: spacesCount ?? 0 },
    { label: "Form submissions", value: submissions.count ?? 0 },
    { label: "Views", value: views.count ?? 0 },
    { label: "Downloads", value: downloads.count ?? 0 }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
