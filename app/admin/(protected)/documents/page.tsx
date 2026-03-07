import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function DocumentsPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, title, file_size, created_at")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Link href="/admin/documents/new" className="bg-slate-900 text-white">
          Upload PDF
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Share</th>
            </tr>
          </thead>
          <tbody>
            {documents?.map((document) => (
              <tr key={document.id} className="border-t border-slate-200">
                <td className="px-4 py-2"><Link className="underline" href={`/admin/documents/${document.id}`}>{document.title}</Link></td>
                <td className="px-4 py-2">{document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : "-"}</td>
                <td className="px-4 py-2">{new Date(document.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <Link className="underline" href={`/admin/share-links/new?targetType=document&targetId=${document.id}`}>
                    Create link
                  </Link>
                </td>
              </tr>
            ))}
            {!documents?.length ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No documents yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
