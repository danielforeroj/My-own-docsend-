import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDocumentLanding, updateDocumentVisibility } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
};

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, title, created_at, storage_path, landing_page, visibility, public_slug, show_in_catalog, is_featured")
    .eq("id", params.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (!document) notFound();

  const [{ count: viewsCount }, { count: downloadsCount }, { data: spaces }] = await Promise.all([
    supabase.from("view_sessions").select("id", { count: "exact", head: true }).eq("document_id", document.id),
    supabase.from("downloads").select("id", { count: "exact", head: true }).eq("document_id", document.id),
    supabase.from("space_documents").select("spaces (id, name)").eq("document_id", document.id)
  ]);

  const adminSupabase = createAdminClient();
  const { data: signed } = await adminSupabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 30);
  const landing = ((document.landing_page ?? {}) as LandingConfig) || {};
  const action = updateDocumentLanding.bind(null, document.id);
  const visibilityAction = updateDocumentVisibility.bind(null, document.id);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/admin/documents" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to documents
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{document.title}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4"><p className="stat-label">Total views</p><p className="stat-value">{viewsCount ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Total downloads</p><p className="stat-value">{downloadsCount ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Created</p><p className="text-sm font-medium">{new Date(document.created_at).toLocaleString()}</p></div>
      </div>


      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Public visibility</h2>
        <p className="mb-3 text-sm text-muted-foreground">Public items can appear in the homepage catalog by slug. Private items stay hidden from catalog and can still be shared via private/share links.</p>
        <form action={visibilityAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="label">Visibility</label>
            <select name="visibility" defaultValue={document.visibility} className="w-full">
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">Public slug (for /docs or /spaces route)</label>
            <input name="public_slug" defaultValue={document.public_slug ?? ""} className="w-full" placeholder="my-public-document" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_in_catalog" defaultChecked={document.show_in_catalog} /> Show in homepage public catalog</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={document.is_featured} /> Featured</label>
          <div className="md:col-span-2 flex justify-end"><button className="btn-primary" type="submit">Save visibility</button></div>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Structured landing page</h2>
        <form action={action} className="grid gap-4 md:grid-cols-2">
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

          <div className="md:col-span-2 flex justify-end"><button className="btn-primary" type="submit">Save landing config</button></div>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Included in Spaces</h2>
        {(spaces ?? []).map((row, i) => (
          <div className="text-sm" key={`${row.spaces?.id ?? "none"}-${i}`}>
            {row.spaces ? <Link className="underline" href={`/admin/spaces/${row.spaces.id}`}>{row.spaces.name}</Link> : "Unknown space"}
          </div>
        ))}
        {!spaces?.length ? <p className="text-sm text-muted-foreground">Not in any space yet.</p> : null}
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
