import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDocumentLandingActionState, updateDocumentVisibilityActionState } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import { FormFieldError, ServerActionForm } from "@/components/ui/server-action-form";
import { SlugField } from "@/components/admin/slug-field";
import { CopyLinkButton } from "@/components/admin/copy-link-button";

type LandingConfig = {
  page_title?: string | null;
  short_description?: string | null;
  eyebrow?: string | null;
  hero_image_url?: string | null;
  logo_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  sidebar_info?: string | null;
  disclaimer?: string | null;
  highlights?: string[];
  about?: string | null;
  footer_text?: string | null;
  layout_variant?: string;
  show_disclaimer?: boolean;
  show_sidebar?: boolean;
  show_about?: boolean;
  show_highlights?: boolean;
  viewer_mode?: "deck" | "document";
  viewer_page_count?: number;
};

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
  const landing = ((document.landing_page ?? {}) as LandingConfig) || {};
  const action = updateDocumentLandingActionState.bind(null, document.id);
  const visibilityAction = updateDocumentVisibilityActionState.bind(null, document.id);

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="mb-1 text-lg font-semibold">Public visibility & URL</h2>
            <p className="text-sm text-muted-foreground">Public items can appear in the homepage catalog with personalized /d or /sp URLs. Private items stay hidden from catalog and can still be shared via private/share links.</p>
          </div>
          {document.public_slug ? <CopyLinkButton path={`/d/${document.public_slug}`} label="Copy public URL" /> : null}
        </div>
        <ServerActionForm action={visibilityAction} className="grid gap-4 md:grid-cols-2" idleLabel="Update visibility" pendingLabel="Updating visibility...">
          {(state) => (
            <>
          <div className="space-y-1">
            <label className="label">Visibility</label>
            <select name="visibility" defaultValue={document.visibility} className="w-full">
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div className="space-y-1">
            <SlugField slugName="public_slug" slugInitial={document.public_slug ?? ""} sourceInitial={document.title} slugLabel="Public URL slug" routePrefix="/d" namespace="document" excludeId={document.id} />
          </div>
          <div className="space-y-1">
            <label className="label">Viewer mode</label>
            <select name="viewer_mode" defaultValue={landing.viewer_mode ?? "document"} className="w-full">
              <option value="document">Document (scroll)</option>
              <option value="deck">Deck (slide-by-slide)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">Viewer page count (for deck mode)</label>
            <input
              type="number"
              min={1}
              max={300}
              name="viewer_page_count"
              defaultValue={landing.viewer_page_count ?? 12}
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_in_catalog" defaultChecked={document.show_in_catalog} /> Show in homepage public catalog</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={document.is_featured} /> Featured</label>
          <FormFieldError state={state} name="public_slug" />
            </>
          )}
        </ServerActionForm>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Structured landing page</h2>
        <ServerActionForm action={action} className="grid gap-4 md:grid-cols-2" idleLabel="Update landing page" pendingLabel="Updating landing page...">
          <div className="space-y-1 md:col-span-2"><label className="label">Page title</label><input name="landing_page_title" defaultValue={landing.page_title ?? ""} className="w-full" /></div>
          <div className="space-y-1 md:col-span-2"><label className="label">Short description</label><textarea name="landing_short_description" rows={3} defaultValue={landing.short_description ?? ""} className="w-full" /></div>
          <div className="space-y-1"><label className="label">Eyebrow</label><input name="landing_eyebrow" defaultValue={landing.eyebrow ?? ""} className="w-full" /></div>
          <div className="space-y-1"><label className="label">Layout variant</label><select name="landing_layout_variant" defaultValue={landing.layout_variant ?? "centered_hero"} className="w-full"><option value="centered_hero">centered hero</option><option value="split_hero">split hero</option><option value="minimal_header">minimal header</option><option value="content_first">content first</option><option value="sidebar_layout">sidebar layout</option></select></div>
          <div className="space-y-1"><label className="label">Hero image URL</label><input name="landing_hero_image" defaultValue={landing.hero_image_url ?? ""} className="w-full" /></div>
          <div className="space-y-1"><label className="label">Logo URL</label><input name="landing_logo" defaultValue={landing.logo_url ?? ""} className="w-full" /></div>
          <div className="space-y-1"><label className="label">CTA label</label><input name="landing_cta_label" defaultValue={landing.cta_label ?? ""} className="w-full" /></div>
          <div className="space-y-1"><label className="label">CTA URL</label><input name="landing_cta_url" defaultValue={landing.cta_url ?? ""} className="w-full" /></div>
          <div className="space-y-1 md:col-span-2"><label className="label">Sidebar info</label><textarea name="landing_sidebar_info" rows={2} defaultValue={landing.sidebar_info ?? ""} className="w-full" /></div>
          <div className="space-y-1 md:col-span-2"><label className="label">Disclaimer</label><textarea name="landing_disclaimer" rows={2} defaultValue={landing.disclaimer ?? ""} className="w-full" /></div>
          <div className="space-y-1 md:col-span-2"><label className="label">Highlights (one per line)</label><textarea name="landing_highlights" rows={3} defaultValue={(landing.highlights ?? []).join("\n")} className="w-full" /></div>
          <div className="space-y-1 md:col-span-2"><label className="label">About section</label><textarea name="landing_about" rows={3} defaultValue={landing.about ?? ""} className="w-full" /></div>
          <div className="space-y-1 md:col-span-2"><label className="label">Footer text</label><input name="landing_footer_text" defaultValue={landing.footer_text ?? ""} className="w-full" /></div>

          <div className="flex flex-wrap gap-4 md:col-span-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_disclaimer" defaultChecked={landing.show_disclaimer ?? false} /> Show disclaimer</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_sidebar" defaultChecked={landing.show_sidebar ?? false} /> Show sidebar</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_about" defaultChecked={landing.show_about ?? false} /> Show about</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_highlights" defaultChecked={landing.show_highlights ?? false} /> Show highlights</label>
          </div>

          </ServerActionForm>
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
