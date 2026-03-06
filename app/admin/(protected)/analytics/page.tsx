import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: spaceRows } = await supabase.from("spaces").select("id").eq("organization_id", ctx.organizationId);
  const spaceIds = spaceRows?.map((s) => s.id) ?? [];

  const [totalViews, uniqueViewers, perDocumentViews, perSpaceViews, downloads, submissions, recentActivity] = await Promise.all([
    spaceIds.length
      ? supabase.from("view_sessions").select("id", { count: "exact", head: true }).in("space_id", spaceIds)
      : Promise.resolve({ count: 0 }),
    spaceIds.length
      ? supabase
          .from("view_sessions")
          .select("visitor_submission_id")
          .in("space_id", spaceIds)
          .not("visitor_submission_id", "is", null)
      : Promise.resolve({ data: [] }),
    spaceIds.length
      ? supabase
          .from("view_sessions")
          .select("document_id")
          .in("space_id", spaceIds)
          .not("document_id", "is", null)
      : Promise.resolve({ data: [] }),
    spaceIds.length ? supabase.from("view_sessions").select("space_id").in("space_id", spaceIds) : Promise.resolve({ data: [] }),
    spaceIds.length ? supabase.from("downloads").select("id", { count: "exact", head: true }).in("space_id", spaceIds) : Promise.resolve({ count: 0 }),
    spaceIds.length
      ? supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).in("space_id", spaceIds)
      : Promise.resolve({ count: 0 }),
    spaceIds.length
      ? supabase
          .from("view_sessions")
          .select("id, space_id, document_id, created_at")
          .in("space_id", spaceIds)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] })
  ]);

  const uniqueViewerCount = new Set((uniqueViewers.data ?? []).map((item) => item.visitor_submission_id)).size;
  const perDocumentCount = (perDocumentViews.data ?? []).reduce<Record<string, number>>((acc, row) => {
    if (!row.document_id) return acc;
    acc[row.document_id] = (acc[row.document_id] ?? 0) + 1;
    return acc;
  }, {});
  const perSpaceCount = (perSpaceViews.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.space_id] = (acc[row.space_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total views</p>
          <p className="text-2xl font-semibold">{totalViews.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Unique viewers</p>
          <p className="text-2xl font-semibold">{uniqueViewerCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Downloads</p>
          <p className="text-2xl font-semibold">{downloads.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Form submissions</p>
          <p className="text-2xl font-semibold">{submissions.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Per-document tracked</p>
          <p className="text-2xl font-semibold">{Object.keys(perDocumentCount).length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Per-space tracked</p>
          <p className="text-2xl font-semibold">{Object.keys(perSpaceCount).length}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div className="rounded-lg border border-slate-200">
          {(recentActivity.data ?? []).map((activity) => (
            <div key={activity.id} className="border-b border-slate-200 px-4 py-3 text-sm last:border-b-0">
              View in space <strong>{activity.space_id}</strong>
              {activity.document_id ? (
                <>
                  {" "}for document <strong>{activity.document_id}</strong>
                </>
              ) : null}
              <div className="text-xs text-slate-500">{new Date(activity.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!recentActivity.data?.length ? <p className="px-4 py-6 text-sm text-slate-500">No activity yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
