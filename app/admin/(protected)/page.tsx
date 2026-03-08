import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/runtime";
import { demoAnalytics, demoDocuments, demoSpaces } from "@/lib/demo-data";

function buildOrgTargetFilter(documentIds: string[], spaceIds: string[]) {
  return [
    documentIds.length ? `document_id.in.(${documentIds.join(",")})` : null,
    spaceIds.length ? `space_id.in.(${spaceIds.join(",")})` : null
  ]
    .filter(Boolean)
    .join(",");
}

export default async function AdminDashboardPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  if (isDemoMode()) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard (Demo)</h1>
          <p className="text-muted-foreground">Preview mode with sample metrics and content.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="card p-4"><p className="stat-label">Total documents</p><p className="stat-value">{demoDocuments.length}</p></div>
          <div className="card p-4"><p className="stat-label">Total spaces</p><p className="stat-value">{demoSpaces.length}</p></div>
          <div className="card p-4"><p className="stat-label">Captured leads</p><p className="stat-value">{demoAnalytics.submissions}</p></div>
          <div className="card p-4"><p className="stat-label">Recent views</p><p className="stat-value">{demoAnalytics.totalViews}</p></div>
        </div>
      </div>
    );
  }


  const [{ data: documents }, { data: spaces }, { data: recentUploads }] = await Promise.all([
    supabase.from("documents").select("id, title, created_at").eq("organization_id", ctx.organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", ctx.organizationId),
    supabase.from("documents").select("id, title, created_at").eq("organization_id", ctx.organizationId).order("created_at", { ascending: false }).limit(8)
  ]);

  const targetFilter = buildOrgTargetFilter((documents ?? []).map((d) => d.id), (spaces ?? []).map((s) => s.id));

  const [viewRows, leadRows] = targetFilter
    ? await Promise.all([
        supabase.from("view_sessions").select("id, created_at, document_id, space_id").or(targetFilter).order("created_at", { ascending: false }).limit(10),
        supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).or(targetFilter)
      ])
    : [{ data: [] }, { count: 0 }];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Fast snapshot of documents, spaces, leads, and recent activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-4"><p className="stat-label">Total documents</p><p className="stat-value">{documents?.length ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Total spaces</p><p className="stat-value">{spaces?.length ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Captured leads</p><p className="stat-value">{leadRows.count ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Recent views</p><p className="stat-value">{viewRows.data?.length ?? 0}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Recent uploads</h2>
          <div className="mt-3 space-y-2">
            {(recentUploads ?? []).map((upload) => (
              <div className="rounded-xl border border-border p-3" key={upload.id}>
                <Link href={`/admin/documents/${upload.id}`} className="font-medium hover:underline">
                  {upload.title}
                </Link>
                <p className="text-xs text-muted-foreground">{new Date(upload.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!recentUploads?.length ? <p className="text-sm text-muted-foreground">No uploads yet. Upload your first PDF.</p> : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold">Recent views</h2>
          <div className="mt-3 space-y-2">
            {(viewRows.data ?? []).map((view) => (
              <div className="rounded-xl border border-border p-3 text-sm" key={view.id}>
                <p>{view.document_id ? `Document view ${view.document_id}` : `Space view ${view.space_id ?? "unknown"}`}</p>
                <p className="text-xs text-muted-foreground">{new Date(view.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!viewRows.data?.length ? <p className="text-sm text-muted-foreground">No views recorded yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
