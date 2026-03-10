import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/auth/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import { SpaceLandingForm, SpaceVisibilityForm } from "@/components/admin/forms/admin-action-forms";

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

export default async function SpaceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = createAdminClientOrNull();
  if (!supabase) throw new Error("Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.");

  const { data: spaceData } = await supabase
    .from("spaces")
    .select("id, name, description, created_at, is_active, landing_page, visibility, public_slug, show_in_catalog, is_featured")
    .eq("id", params.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  type SpaceRow = Pick<
    Database["public"]["Tables"]["spaces"]["Row"],
    "id" | "name" | "description" | "created_at" | "is_active" | "landing_page" | "visibility" | "public_slug" | "show_in_catalog" | "is_featured"
  >;
  const space = spaceData as SpaceRow | null;

  if (!space) notFound();

  const [{ count: viewsCount }, { count: submissionsCount }, { data: docs }] = await Promise.all([
    supabase.from("view_sessions").select("id", { count: "exact", head: true }).eq("space_id", space.id),
    supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).eq("space_id", space.id),
    supabase
      .from("space_documents")
      .select("position, documents (id, title)")
      .eq("space_id", space.id)
      .order("position")
  ]);

  const landing = ((space.landing_page ?? {}) as LandingConfig) || {};

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/admin/spaces" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to spaces
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{space.name}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4"><p className="stat-label">Total views</p><p className="stat-value">{viewsCount ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Captured submissions</p><p className="stat-value">{submissionsCount ?? 0}</p></div>
        <div className="card p-4"><p className="stat-label">Status</p><p className="text-sm font-medium">{space.is_active ? "Active" : "Inactive"}</p></div>
      </div>


      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Public visibility & URL</h2>
        <p className="mb-3 text-sm text-muted-foreground">Public items can appear in the homepage catalog with personalized /d or /sp URLs. Private items stay hidden from catalog and can still be shared via private/share links.</p>
        <SpaceVisibilityForm space={space} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Structured landing page</h2>
        <SpaceLandingForm spaceId={space.id} landing={landing} />
      </section>

      {space.description ? (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Description</h2>
          <p className="text-sm text-muted-foreground">{space.description}</p>
        </section>
      ) : null}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Documents in this Space</h2>
        {((docs ?? []) as Array<{ documents: { id: string; title: string } | null }>).map((row, index) => (
          <div className="text-sm" key={`${row.documents?.id ?? "none"}-${index}`}>
            {row.documents ? <Link className="underline" href={`/admin/documents/${row.documents.id}`}>{row.documents.title}</Link> : "Unknown document"}
          </div>
        ))}
        {!docs?.length ? <p className="text-sm text-muted-foreground">No documents assigned yet.</p> : null}
      </section>
    </div>
  );
}
