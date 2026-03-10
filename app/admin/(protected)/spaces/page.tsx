import Link from "next/link";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { requireAdminContext } from "@/lib/auth/server";
import { getSpacesData } from "@/lib/data/repository";

export default async function SpacesPage() {
  const ctx = await requireAdminContext();
  const { source, spaces, error } = await getSpacesData(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Data rooms</p>
          <h1 className="text-3xl font-semibold tracking-tight">Spaces</h1>
          <p className="text-muted-foreground">Group documents into polished spaces for clients and partners.</p>
          {source === "demo" ? <p className="mt-2 text-xs text-yellow-300">Demo mode: create/edit actions are disabled.</p> : null}
        </div>
        {source === "demo" ? <span className="btn-secondary inline-flex items-center justify-center opacity-70">Create space (Demo mode)</span> : <Link href="/admin/spaces/new" className="btn-primary inline-flex items-center justify-center">Create space</Link>}
      </div>

      {error ? (
        <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
          <h2 className="font-semibold text-red-300">Could not load spaces from Supabase</h2>
          <p className="mt-1 text-sm text-red-200">The spaces query failed. Check admin Supabase configuration and database permissions.</p>
          <p className="mt-2 text-xs text-red-200/90">Details: {error}</p>
        </section>
      ) : null}

      {source === "supabase" && spaces.length === 0 ? (
        <section className="card p-4">
          <h2 className="font-semibold">No spaces yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Spaces help you bundle documents for a client or use case. Create one, then add documents from the space editor.</p>
          <div className="mt-3">
            <Link href="/admin/spaces/new" className="btn-primary inline-flex items-center">Create your first space</Link>
          </div>
        </section>
      ) : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Public URL slug</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {spaces.map((space: { id: string; name: string; is_active: boolean; visibility?: string; public_slug?: string | null }) => (
                <tr key={space.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/admin/spaces/${space.id}`}>{space.name}</Link></td>
                  <td className="px-4 py-3 text-muted-foreground">{space.public_slug ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{space.visibility ?? "private"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${space.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{space.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap justify-start gap-1.5 md:justify-end md:gap-2">{space.public_slug ? <CopyLinkButton className="btn-inline btn-inline-compact" path={`/sp/${space.public_slug}`} label="Copy space URL" /> : null}<Link className="btn-inline btn-inline-compact" href={`/admin/spaces/${space.id}/edit`}>Edit space</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
