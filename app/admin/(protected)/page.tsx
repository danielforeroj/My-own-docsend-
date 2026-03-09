import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { getDashboardData } from "@/lib/data/repository";

export default async function AdminDashboardPage() {
  const ctx = await requireAdminContext();
  const data = await getDashboardData(ctx.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Fast snapshot of documents, spaces, leads, and recent activity.</p>
        {data.source === "demo" ? <p className="mt-2 text-xs text-yellow-300">Demo mode: showing mock dashboard metrics.</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-4"><p className="stat-label">Total documents</p><p className="stat-value">{data.documents.length}</p></div>
        <div className="card p-4"><p className="stat-label">Total spaces</p><p className="stat-value">{data.spaces.length}</p></div>
        <div className="card p-4"><p className="stat-label">Captured leads</p><p className="stat-value">{data.leadCount}</p></div>
        <div className="card p-4"><p className="stat-label">Recent views</p><p className="stat-value">{data.recentViews.length}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Recent uploads</h2>
          <div className="mt-3 space-y-2">
            {data.recentUploads.map((upload) => (
              <div className="rounded-xl border border-border p-3" key={upload.id}>
                <Link href={`/admin/documents/${upload.id}`} className="font-medium hover:underline">
                  {upload.title}
                </Link>
                <p className="text-xs text-muted-foreground">{new Date(upload.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!data.recentUploads.length ? <p className="text-sm text-muted-foreground">No uploads yet. Upload your first PDF.</p> : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold">Recent views</h2>
          <div className="mt-3 space-y-2">
            {data.recentViews.map((view) => (
              <div className="rounded-xl border border-border p-3 text-sm" key={view.id}>
                <p>{view.document_id ? `Document view ${view.document_id}` : `Space view ${view.space_id ?? "unknown"}`}</p>
                <p className="text-xs text-muted-foreground">{new Date(view.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!data.recentViews.length ? <p className="text-sm text-muted-foreground">No views recorded yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
