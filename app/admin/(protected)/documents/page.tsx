import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { getDocumentsData } from "@/lib/data/repository";

export default async function DocumentsPage() {
  const ctx = await requireAdminContext();
  const { source, documents, error } = await getDocumentsData(ctx.organizationId);

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

      {error ? (
        <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
          <h2 className="font-semibold text-red-300">Could not load documents from Supabase</h2>
          <p className="mt-1 text-sm text-red-200">The documents query failed. Check database schema/permissions and server env configuration.</p>
          <p className="mt-2 text-xs text-red-200/90">Details: {error}</p>
        </section>
      ) : null}

      {!error && source === "supabase" && documents.length === 0 ? (
        <section className="card p-4">
          <h2 className="font-semibold">No documents yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upload your first PDF to see it here and assign it to spaces.</p>
          <div className="mt-3">
            <Link href="/admin/documents/new" className="btn-primary inline-flex items-center">Upload your first PDF</Link>
          </div>
        </section>
      ) : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document: { id: string; title: string; file_size?: number | null; created_at: string; visibility?: string }) => (
                <tr key={document.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/admin/documents/${document.id}`}>{document.title}</Link></td>
                  <td className="px-4 py-3 text-muted-foreground">{document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{document.visibility ?? "private"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(document.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link className="btn-inline" href={`/admin/share-links/new?targetType=document&targetId=${document.id}`}>Create link</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
