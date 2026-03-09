import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { getDocumentsData } from "@/lib/data/repository";

export default async function DocumentsPage() {
  const ctx = await requireAdminContext();
  const { source, documents } = await getDocumentsData(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Library</p>
          <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Upload, organize, and share PDFs with trackable links.</p>
          {source === "demo" ? <p className="mt-2 text-xs text-yellow-300">Demo mode: uploads are disabled.</p> : null}
        </div>
        {source === "demo" ? <span className="btn-secondary inline-flex items-center justify-center opacity-70">Upload PDF (Demo mode)</span> : <Link href="/admin/documents/new" className="btn-primary inline-flex items-center justify-center">Upload PDF</Link>}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document: { id: string; title: string; file_size?: number | null; created_at: string; visibility?: string }) => (
              <tr key={document.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/admin/documents/${document.id}`}>{document.title}</Link></td>
                <td className="px-4 py-3 text-muted-foreground">{document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{document.visibility ?? "private"}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(document.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link className="btn-secondary inline-flex items-center" href={`/admin/share-links/new?targetType=document&targetId=${document.id}`}>Create link</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
