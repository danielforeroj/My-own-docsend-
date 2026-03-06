import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function SpacesPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: spaces, error } = await supabase
    .from("spaces")
    .select("id, name, slug, is_active, created_at")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spaces</h1>
        <Link href="/admin/spaces/new" className="bg-slate-900 text-white">
          New Space
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {spaces?.map((space) => (
              <tr key={space.id} className="border-t border-slate-200">
                <td className="px-4 py-2">{space.name}</td>
                <td className="px-4 py-2 text-slate-600">{space.slug}</td>
                <td className="px-4 py-2">{space.is_active ? "Active" : "Inactive"}</td>
                <td className="space-x-3 px-4 py-2">
                  <Link className="text-slate-700 underline" href={`/admin/spaces/${space.id}/edit`}>
                    Edit
                  </Link>
                  <Link className="text-slate-700 underline" href={`/admin/share-links/new?targetType=space&targetId=${space.id}`}>
                    Create link
                  </Link>
                </td>
              </tr>
            ))}
            {!spaces?.length ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No spaces yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
