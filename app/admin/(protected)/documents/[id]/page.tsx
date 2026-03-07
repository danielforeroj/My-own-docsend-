import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, title, created_at, storage_path")
    .eq("id", params.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (!document) notFound();

  const [{ count: viewsCount }, { count: downloadsCount }, { data: spaces }] = await Promise.all([
    supabase.from("view_sessions").select("id", { count: "exact", head: true }).eq("document_id", document.id),
    supabase.from("downloads").select("id", { count: "exact", head: true }).eq("document_id", document.id),
    supabase.from("space_documents").select("spaces (id, name)").eq("document_id", document.id)
  ]);

  const { data: signed } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 30);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/documents" className="text-sm text-slate-600 underline">
          ← Back to documents
        </Link>
        <h1 className="text-2xl font-semibold">{document.title}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total views</p>
          <p className="text-2xl font-semibold">{viewsCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total downloads</p>
          <p className="text-2xl font-semibold">{downloadsCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Created</p>
          <p className="text-sm font-medium">{new Date(document.created_at).toLocaleString()}</p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="mb-2 font-semibold">Included in Spaces</h2>
        {(spaces ?? []).map((row, i) => (
          <div className="text-sm" key={`${row.spaces?.id ?? "none"}-${i}`}>
            {row.spaces ? (
              <Link className="underline" href={`/admin/spaces/${row.spaces.id}`}>
                {row.spaces.name}
              </Link>
            ) : (
              "Unknown space"
            )}
          </div>
        ))}
        {!spaces?.length ? <p className="text-sm text-slate-500">Not in any space yet.</p> : null}
      </section>

      {signed?.signedUrl ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Preview</h2>
          <iframe title={document.title} src={signed.signedUrl} className="h-[70vh] w-full rounded border border-slate-200" />
        </section>
      ) : null}
    </div>
  );
}
