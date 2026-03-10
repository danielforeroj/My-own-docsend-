import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import { DocumentVisibilityForm } from "@/components/admin/forms/admin-action-forms";

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: documentData, error: documentError } = await supabase
    .from("documents")
    .select("id, title, created_at, storage_path, landing_page, visibility, public_slug, show_in_catalog, is_featured")
    .eq("id", params.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  type DocumentRow = Pick<
    Database["public"]["Tables"]["documents"]["Row"],
    "id" | "title" | "created_at" | "storage_path" | "landing_page" | "visibility" | "public_slug" | "show_in_catalog" | "is_featured"
  >;
  const document = documentData as DocumentRow | null;

  if (documentError) {
    return (
      <div className="space-y-4">
        <Link href="/admin/documents" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to documents
        </Link>
        <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
          <h1 className="text-xl font-semibold text-red-300">Could not load document details</h1>
          <p className="mt-2 text-sm text-red-200">Supabase returned an error while loading this document.</p>
          <p className="mt-2 text-xs text-red-200/90">
            Details: {documentError.message}
            {documentError.code ? ` (code: ${documentError.code})` : ""}
          </p>
        </section>
      </div>
    );
  }

  if (!document) notFound();

  const [{ count: viewsCount, error: viewsError }, { count: downloadsCount, error: downloadsError }, { data: spacesData, error: spacesError }] = await Promise.all([
    supabase.from("view_sessions").select("id", { count: "exact", head: true }).eq("document_id", document.id),
    supabase.from("downloads").select("id", { count: "exact", head: true }).eq("document_id", document.id),
    supabase.from("space_documents").select("spaces (id, name)").eq("document_id", document.id)
  ]);

  const spaces = (spacesData ?? []) as Array<{ spaces: { id: string; name: string } | null }>;

  const adminSupabase = createAdminClient();
  const { data: signed } = await adminSupabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 30);

  const landing = ((document.landing_page ?? {}) as { viewer_mode?: "deck" | "document"; viewer_page_count?: number }) || {};

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/admin/documents" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to documents
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{document.title}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4"><p className="stat-label">Total views</p><p className="stat-value">{viewsError ? "—" : viewsCount ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Total downloads</p><p className="stat-value">{downloadsError ? "—" : downloadsCount ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Created</p><p className="text-sm font-medium">{new Date(document.created_at).toLocaleString()}</p></div>
      </div>

      {viewsError || downloadsError ? (
        <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold text-red-300">Analytics could not be fully loaded.</p>
          {viewsError ? <p className="mt-1">Views query: {viewsError.message}</p> : null}
          {downloadsError ? <p className="mt-1">Downloads query: {downloadsError.message}</p> : null}
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Viewer settings</h2>
        <p className="mb-3 text-sm text-muted-foreground">Sharing is managed through Share Links. Configure only how this document is displayed to recipients.</p>
        <DocumentVisibilityForm document={document} landing={landing} />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Included in spaces</h2>
          <Link href="/admin/spaces" className="btn-secondary">Manage in spaces</Link>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Documents are assigned to spaces from the space management flow.</p>

        {spacesError ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            Could not load space assignments: {spacesError.message}
          </div>
        ) : (
          <>
            {(spaces ?? []).map((row, i) => (
              <div className="flex items-center justify-between gap-3 text-sm" key={`${row.spaces?.id ?? "none"}-${i}`}>
                <span>{row.spaces ? <Link className="underline" href={`/admin/spaces/${row.spaces.id}`}>{row.spaces.name}</Link> : "Unknown space"}</span>
                {row.spaces ? <Link className="text-xs text-muted-foreground underline" href={`/admin/spaces/${row.spaces.id}/edit`}>Manage documents in space</Link> : null}
              </div>
            ))}
            {!spaces?.length ? <p className="text-sm text-muted-foreground">This document is not in any space yet. Use <span className="font-medium">Manage in spaces</span> to assign it.</p> : null}
          </>
        )}
      </section>

      {signed?.signedUrl ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Preview</h2>
          <iframe title={document.title} src={signed.signedUrl} className="h-[70vh] w-full rounded-xl border border-border" />
        </section>
      ) : null}
    </div>
  );
}
