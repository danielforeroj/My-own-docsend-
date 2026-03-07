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

export default async function AnalyticsPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: documents }, { data: spaces }] = await Promise.all([
    supabase.from("documents").select("id, title").eq("organization_id", ctx.organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", ctx.organizationId)
  ]);

  const documentIds = (documents ?? []).map((doc) => doc.id);
  const spaceIds = (spaces ?? []).map((space) => space.id);
  const targetFilter = buildOrgTargetFilter(documentIds, spaceIds);

  const [allViewsQuery, recentViewsQuery, allDownloadsQuery, allSubmissionsQuery] = targetFilter
    ? await Promise.all([
        supabase.from("view_sessions").select("id, document_id, space_id, visitor_submission_id").or(targetFilter),
        supabase
          .from("view_sessions")
          .select("id, document_id, space_id, visitor_submission_id, created_at")
          .or(targetFilter)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase.from("downloads").select("id, document_id, space_id").or(targetFilter),
        supabase.from("visitor_submissions").select("id, space_id, document_id").or(targetFilter)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const allViews = allViewsQuery.data ?? [];
  const recentVisits = recentViewsQuery.data ?? [];
  const allDownloads = allDownloadsQuery.data ?? [];
  const allSubmissions = allSubmissionsQuery.data ?? [];

  const uniqueViewerCount = new Set(
    allViews.map((view) => view.visitor_submission_id).filter((id): id is string => Boolean(id))
  ).size;

  const perDocument = new Map<string, { title: string; views: number; downloads: number }>();
  for (const doc of documents ?? []) {
    perDocument.set(doc.id, { title: doc.title, views: 0, downloads: 0 });
  }

  for (const view of allViews) {
    if (view.document_id && perDocument.has(view.document_id)) {
      perDocument.get(view.document_id)!.views += 1;
    }
  }

  for (const download of allDownloads) {
    if (download.document_id && perDocument.has(download.document_id)) {
      perDocument.get(download.document_id)!.downloads += 1;
    }
  }

  const perSpace = new Map<string, { name: string; views: number; submissions: number }>();
  for (const space of spaces ?? []) {
    perSpace.set(space.id, { name: space.name, views: 0, submissions: 0 });
  }

  for (const view of allViews) {
    if (view.space_id && perSpace.has(view.space_id)) {
      perSpace.get(view.space_id)!.views += 1;
    }
  }

  for (const submission of allSubmissions) {
    if (submission.space_id && perSpace.has(submission.space_id)) {
      perSpace.get(submission.space_id)!.submissions += 1;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total views</p>
          <p className="text-2xl font-semibold">{allViews.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Unique viewers</p>
          <p className="text-2xl font-semibold">{uniqueViewerCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Downloads</p>
          <p className="text-2xl font-semibold">{allDownloads.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Captured submissions</p>
          <p className="text-2xl font-semibold">{allSubmissions.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per-document views</h2>
        <div className="rounded-lg border border-slate-200">
          {Array.from(perDocument.entries()).map(([id, data]) => (
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={id}>
              <Link href={`/admin/documents/${id}`} className="underline">
                {data.title}
              </Link>
              <span>Views: {data.views}</span>
              <span>Downloads: {data.downloads}</span>
            </div>
          ))}
          {!perDocument.size ? <p className="px-4 py-6 text-sm text-slate-500">No documents yet.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per-space views</h2>
        <div className="rounded-lg border border-slate-200">
          {Array.from(perSpace.entries()).map(([id, data]) => (
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={id}>
              <Link href={`/admin/spaces/${id}`} className="underline">
                {data.name}
              </Link>
              <span>Views: {data.views}</span>
              <span>Submissions: {data.submissions}</span>
            </div>
          ))}
          {!perSpace.size ? <p className="px-4 py-6 text-sm text-slate-500">No spaces yet.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent visits</h2>
        <div className="rounded-lg border border-slate-200">
          {recentVisits.map((visit) => (
            <div className="border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={visit.id}>
              {visit.document_id ? `Document ${visit.document_id}` : `Space ${visit.space_id ?? "unknown"}`}
              <div className="text-xs text-slate-500">{new Date(visit.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!recentVisits.length ? <p className="px-4 py-6 text-sm text-slate-500">No visits yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
