import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/runtime";
import { demoSpaces } from "@/lib/demo-data";

export default async function SpacesPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: spacesData, error } = await supabase
    .from("spaces")
    .select("id, name, slug, is_active, created_at, visibility, show_in_catalog")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (error && !isDemoMode()) throw new Error(error.message);

  const spaces = isDemoMode() ? demoSpaces : spacesData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Data rooms</p>
          <h1 className="text-3xl font-semibold tracking-tight">Spaces</h1>
          <p className="text-muted-foreground">Group documents into polished spaces for clients and partners.</p>
        </div>
        <Link href="/admin/spaces/new" className="btn-primary inline-flex items-center justify-center">
          New Space
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((space) => (
              <tr key={space.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/admin/spaces/${space.id}`}>{space.name}</Link></td>
                <td className="px-4 py-3 text-muted-foreground">{space.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{space.visibility}{space.show_in_catalog ? " • catalog" : ""}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${space.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {space.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="space-x-2 px-4 py-3 text-right">
                  <Link className="btn-secondary inline-flex items-center" href={`/admin/spaces/${space.id}/edit`}>
                    Edit
                  </Link>
                  <Link className="btn-secondary inline-flex items-center" href={`/admin/share-links/new?targetType=space&targetId=${space.id}`}>
                    Create link
                  </Link>
                </td>
              </tr>
            ))}
            {!spaces.length ? (
              <tr>
                <td className="px-4 py-12 text-center text-muted-foreground" colSpan={5}>
                  No spaces yet. Create one to start building structured data rooms.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
