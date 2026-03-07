import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

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

  const [{ data: documents }, { data: spaces }, { data: recentUploads }] = await Promise.all([
    supabase.from("documents").select("id, title, created_at").eq("organization_id", ctx.organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", ctx.organizationId),
    supabase
      .from("documents")
      .select("id, title, created_at")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  const documentIds = (documents ?? []).map((doc) => doc.id);
  const spaceIds = (spaces ?? []).map((space) => space.id);
  const targetFilter = buildOrgTargetFilter(documentIds, spaceIds);

  const [viewRows, leadRows] = targetFilter
    ? await Promise.all([
        supabase
          .from("view_sessions")
          .select("id, created_at, document_id, space_id")
          .or(targetFilter)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).or(targetFilter)
      ])
    : [{ data: [] }, { count: 0 }];

  const totalDocuments = documents?.length ?? 0;
  const totalSpaces = spaces?.length ?? 0;
  const capturedLeads = leadRows.count ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total documents</p>
          <p className="text-2xl font-semibold">{totalDocuments}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Spaces</p>
          <p className="text-2xl font-semibold">{totalSpaces}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Captured leads</p>
          <p className="text-2xl font-semibold">{capturedLeads}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Recent views</p>
          <p className="text-2xl font-semibold">{viewRows.data?.length ?? 0}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent uploads</h2>
        <div className="rounded-lg border border-slate-200">
          {(recentUploads ?? []).map((upload) => (
            <div className="border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={upload.id}>
              <Link href={`/admin/documents/${upload.id}`} className="underline">
                {upload.title}
              </Link>
              <div className="text-xs text-slate-500">{new Date(upload.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!recentUploads?.length ? <p className="px-4 py-6 text-sm text-slate-500">No uploads yet.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent views</h2>
        <div className="rounded-lg border border-slate-200">
          {(viewRows.data ?? []).map((view) => (
            <div className="border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={view.id}>
              {view.document_id ? `Document view ${view.document_id}` : `Space view ${view.space_id ?? "unknown"}`}
              <div className="text-xs text-slate-500">{new Date(view.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!viewRows.data?.length ? <p className="px-4 py-6 text-sm text-slate-500">No views yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
