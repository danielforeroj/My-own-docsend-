import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { getAnalyticsData } from "@/lib/data/repository";

export default async function AnalyticsPage() {
  const ctx = await requireAdminContext();
  const data = await getAnalyticsData(ctx.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      {data.source === "demo" ? <p className="text-xs text-yellow-300">Demo mode: analytics are mock summary data.</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-600">Total views</p><p className="text-2xl font-semibold">{data.totals.totalViews}</p></div>
        <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-600">Unique viewers</p><p className="text-2xl font-semibold">{data.totals.uniqueViewers}</p></div>
        <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-600">Downloads</p><p className="text-2xl font-semibold">{data.totals.downloads}</p></div>
        <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-600">Captured submissions</p><p className="text-2xl font-semibold">{data.totals.submissions}</p></div>
      </div>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Per-document views</h2><div className="rounded-lg border border-slate-200">{data.perDocument.map((item: { id: string; title: string; views: number; downloads: number }) => <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={item.id}><Link href={`/admin/documents/${item.id}`} className="underline">{item.title}</Link><span>Views: {item.views}</span><span>Downloads: {item.downloads}</span></div>)}</div></section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Per-space views</h2><div className="rounded-lg border border-slate-200">{data.perSpace.map((item: { id: string; name: string; views: number; submissions: number }) => <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={item.id}><Link href={`/admin/spaces/${item.id}`} className="underline">{item.name}</Link><span>Views: {item.views}</span><span>Submissions: {item.submissions}</span></div>)}</div></section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Recent visits</h2><div className="rounded-lg border border-slate-200">{data.totals.recentVisits.map((visit: { id: string; documentId: string | null; spaceId: string | null; createdAt: string }) => <div className="border-b border-slate-200 px-4 py-3 text-sm last:border-b-0" key={visit.id}>{visit.documentId ? `Document ${visit.documentId}` : `Space ${visit.spaceId ?? "unknown"}`}<div className="text-xs text-slate-500">{new Date(visit.createdAt).toLocaleString()}</div></div>)}</div></section>
    </div>
  );
}
