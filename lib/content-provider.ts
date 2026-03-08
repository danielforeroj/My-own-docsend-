import "server-only";

import { demoDocuments, demoSpaces } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCatalogData() {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return {
      documents: demoDocuments.filter((d) => d.visibility === "public" && d.show_in_catalog),
      spaces: demoSpaces.filter((s) => s.visibility === "public" && s.show_in_catalog)
    };
  }

  const supabase = createAdminClient();
  const [{ data: documents }, { data: spaces }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, public_slug, landing_page, created_at")
      .eq("visibility", "public")
      .eq("show_in_catalog", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("spaces")
      .select("id, name, description, public_slug, landing_page, created_at")
      .eq("visibility", "public")
      .eq("show_in_catalog", true)
      .order("created_at", { ascending: false })
  ]);

  return {
    documents:
      documents?.map((d) => ({
        id: d.id,
        title: d.title,
        slug: d.public_slug,
        description: ((d.landing_page as Record<string, string | null> | null)?.short_description ?? "") || "",
        created_at: d.created_at
      })) ?? [],
    spaces:
      spaces?.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.public_slug,
        description: s.description ?? "",
        created_at: s.created_at
      })) ?? []
  };
}

export async function getPublicDocumentBySlug(slug: string) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return demoDocuments.find((d) => d.slug === slug && d.visibility === "public") ?? null;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, landing_page, public_slug, visibility, storage_path")
    .eq("public_slug", slug)
    .eq("visibility", "public")
    .maybeSingle();

  return data;
}

export async function getPublicSpaceBySlug(slug: string) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return demoSpaces.find((s) => s.slug === slug && s.visibility === "public") ?? null;
  }

  const supabase = createAdminClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, description, landing_page, public_slug, visibility")
    .eq("public_slug", slug)
    .eq("visibility", "public")
    .maybeSingle();

  if (!space) return null;

  const { data: docs } = await supabase.from("space_documents").select("documents (id, title)").eq("space_id", space.id).order("position");

  return {
    ...space,
    documents: ((docs ?? []) as Array<{ documents: { id: string; title: string } | null }>).map((row) => row.documents).filter(Boolean)
  };
}
