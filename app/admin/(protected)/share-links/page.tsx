import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function ShareLinksPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: links, error } = await supabase
    .from("share_links")
    .select("id, token, name, link_type, created_at, requires_intake, space_id, document_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Share Links</h1>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Intake</th>
              <th className="px-4 py-2">Public URL</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links?.map((link) => (
              <tr key={link.id} className="border-t border-slate-200">
                <td className="px-4 py-2">{link.name || "-"}</td>
                <td className="px-4 py-2">{link.link_type}</td>
                <td className="px-4 py-2">{link.requires_intake ? "Required" : "Disabled"}</td>
                <td className="px-4 py-2 text-xs">/s/{link.token}</td>
                <td className="space-x-3 px-4 py-2">
                  <Link className="underline" href={`/admin/share-links/${link.id}`}>
                    Configure
                  </Link>
                  <Link className="underline" href={`/s/${link.token}`} target="_blank">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!links?.length ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No share links yet. Create one from Documents or Spaces.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
