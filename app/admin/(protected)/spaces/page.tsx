import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { getSpacesData } from "@/lib/data/repository";

export default async function SpacesPage() {
  const ctx = await requireAdminContext();
  const { source, spaces } = await getSpacesData(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Data rooms</p>
          <h1 className="text-3xl font-semibold tracking-tight">Spaces</h1>
          <p className="text-muted-foreground">Group documents into polished spaces for clients and partners.</p>
          {source === "demo" ? <p className="mt-2 text-xs text-yellow-300">Demo mode: create/edit actions are disabled.</p> : null}
        </div>
        {source === "demo" ? <span className="btn-secondary inline-flex items-center justify-center opacity-70">New Space (Demo mode)</span> : <Link href="/admin/spaces/new" className="btn-primary inline-flex items-center justify-center">New Space</Link>}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {spaces.map((space: { id: string; name: string; slug: string; is_active: boolean; visibility?: string }) => (
              <tr key={space.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/admin/spaces/${space.id}`}>{space.name}</Link></td>
                <td className="px-4 py-3 text-muted-foreground">{space.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{space.visibility ?? "private"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${space.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{space.is_active ? "Active" : "Inactive"}</span></td>
                <td className="space-x-2 px-4 py-3 text-right"><Link className="btn-secondary inline-flex items-center" href={`/admin/spaces/${space.id}/edit`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
