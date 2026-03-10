import "server-only";

import { createClientOrNull } from "@/lib/supabase/server";
import { createAdminClient, createAdminClientOrNull } from "@/lib/supabase/admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";
import { mockAnalyticsSummary, mockBrandingSettings, mockDocuments, mockShareLinks, mockSpaces } from "@/lib/data/mock";
import type { Database } from "@/lib/db/types";

export function shouldUseDemoData() {
  return isDemoMode() || !isSupabaseConfigured();
}

export async function getDashboardData(organizationId: string) {
  if (shouldUseDemoData()) {
    return {
      source: "demo" as const,
      documents: mockDocuments.map((d) => ({ id: d.id, title: d.title, created_at: d.createdAt })),
      spaces: mockSpaces.map((s) => ({ id: s.id, name: s.name })),
      recentUploads: mockDocuments.map((d) => ({ id: d.id, title: d.title, created_at: d.createdAt })),
      recentViews: mockAnalyticsSummary.recentVisits.map((v) => ({ id: v.id, document_id: v.documentId, space_id: v.spaceId, created_at: v.createdAt })),
      leadCount: mockAnalyticsSummary.submissions
    };
  }

  const supabase = await createClientOrNull();
  if (!supabase) return { source: "demo" as const, documents: [], spaces: [], recentUploads: [], recentViews: [], leadCount: 0 };

  const [{ data: documents }, { data: spaces }, { data: recentUploads }] = await Promise.all([
    supabase.from("documents").select("id, title, created_at").eq("organization_id", organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", organizationId),
    supabase.from("documents").select("id, title, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(8)
  ]);

  return {
    source: "supabase" as const,
    documents: documents ?? [],
    spaces: spaces ?? [],
    recentUploads: recentUploads ?? [],
    recentViews: [],
    leadCount: 0
  };
}

export async function getDocumentsData(organizationId: string) {
  if (shouldUseDemoData()) {
    return {
      source: "demo" as const,
      documents: mockDocuments.map((d) => ({ id: d.id, title: d.title, file_size: d.fileSize, created_at: d.createdAt, visibility: d.visibility, public_slug: d.publicSlug, show_in_catalog: d.showInCatalog, is_featured: d.isFeatured, landing_page: d.landingPage ?? null })),
      error: null as string | null
    };
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    return {
      source: "supabase" as const,
      documents: [],
      error: "Supabase is configured but the server client could not be initialized."
    };
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, file_size, created_at, visibility, public_slug, show_in_catalog, is_featured, landing_page")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  return {
    source: "supabase" as const,
    documents: data ?? [],
    error: error ? `${error.message}${error.code ? ` (code: ${error.code})` : ""}` : null
  };
}

export async function getSpacesData(organizationId: string) {
  if (shouldUseDemoData()) {
    return {
      source: "demo" as const,
      spaces: mockSpaces.map((s) => ({ id: s.id, name: s.name, slug: s.slug, is_active: s.isActive, created_at: s.createdAt, visibility: s.visibility, public_slug: s.publicSlug, show_in_catalog: s.showInCatalog, is_featured: s.isFeatured })),
      error: null as string | null
    };
  }
  const supabase = createAdminClientOrNull();
  if (!supabase) return { source: "supabase" as const, spaces: [], error: "Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY." };

  const { data, error } = await supabase
    .from("spaces")
    .select("id, name, slug, is_active, created_at, visibility, public_slug, show_in_catalog, is_featured")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  return {
    source: "supabase" as const,
    spaces: data ?? [],
    error: error ? `${error.message}${error.code ? ` (code: ${error.code})` : ""}` : null
  };
}

export async function getShareLinksData(organizationId: string) {
  if (shouldUseDemoData()) {
    return {
      source: "demo" as const,
      links: mockShareLinks.map((l) => ({ id: l.id, token: l.token, name: l.name, link_type: l.linkType, created_at: l.createdAt, requires_intake: l.requiresIntake }))
    };
  }
  const supabase = await createClientOrNull();
  if (!supabase) return { source: "demo" as const, links: [] };
  const { data } = await supabase.from("share_links").select("id, token, name, link_type, created_at, requires_intake").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return { source: "supabase" as const, links: data ?? [] };
}

export async function getAnalyticsData(organizationId: string) {
  if (shouldUseDemoData()) {
    return {
      source: "demo" as const,
      documents: mockDocuments.map((d) => ({ id: d.id, title: d.title })),
      spaces: mockSpaces.map((s) => ({ id: s.id, name: s.name })),
      totals: mockAnalyticsSummary,
      perDocument: mockDocuments.map((d, i) => ({ id: d.id, title: d.title, views: 15 - i * 4, downloads: 5 - i * 2 })),
      perSpace: mockSpaces.map((s, i) => ({ id: s.id, name: s.name, views: 20 - i * 6, submissions: 4 - i }))
    };
  }
  const supabase = await createClientOrNull();
  if (!supabase) return { source: "demo" as const, documents: [], spaces: [], totals: { totalViews: 0, uniqueViewers: 0, downloads: 0, submissions: 0, recentVisits: [] }, perDocument: [], perSpace: [] };
  const [{ data: documents }, { data: spaces }] = await Promise.all([
    supabase.from("documents").select("id, title").eq("organization_id", organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", organizationId)
  ]);
  return {
    source: "supabase" as const,
    documents: documents ?? [],
    spaces: spaces ?? [],
    totals: { totalViews: 0, uniqueViewers: 0, downloads: 0, submissions: 0, recentVisits: [] },
    perDocument: [],
    perSpace: []
  };
}

export async function getSettingsData(organizationId: string) {
  if (shouldUseDemoData()) {
    return {
      source: "demo" as const,
      organizationName: mockBrandingSettings.organizationName,
      members: mockBrandingSettings.members,
      branding: mockBrandingSettings
    };
  }
  const supabase = await createClientOrNull();
  if (!supabase) return { source: "demo" as const, organizationName: "Demo Organization", members: [], branding: null };
  const [{ data: orgData }, { data: membersData }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    supabase.from("memberships").select("role, user_id").eq("organization_id", organizationId).order("created_at", { ascending: true })
  ]);
  const org = orgData as Pick<Database["public"]["Tables"]["organizations"]["Row"], "name"> | null;
  const members = (membersData ?? []) as Array<Pick<Database["public"]["Tables"]["memberships"]["Row"], "user_id" | "role">>;

  return {
    source: "supabase" as const,
    organizationName: org?.name ?? "Not found",
    members: members.map((m) => ({ userId: m.user_id, role: m.role })),
    branding: null
  };
}

export async function getPublicCatalogData() {
  if (shouldUseDemoData()) {
    const publicDocuments = mockDocuments
      .filter((doc) => doc.visibility === "public" && doc.showInCatalog && doc.publicSlug)
      .map((doc) => ({ id: doc.id, title: doc.title, public_slug: doc.publicSlug!, is_featured: doc.isFeatured, created_at: doc.createdAt }));

    const publicSpaces = mockSpaces
      .filter((space) => space.visibility === "public" && space.showInCatalog && space.publicSlug)
      .map((space) => ({ id: space.id, name: space.name, description: space.description, public_slug: space.publicSlug!, is_featured: space.isFeatured, created_at: space.createdAt }));

    return {
      source: "demo" as const,
      documents: publicDocuments,
      spaces: publicSpaces,
      featuredDocuments: publicDocuments.filter((d) => d.is_featured),
      featuredSpaces: publicSpaces.filter((s) => s.is_featured)
    };
  }

  const supabase = createAdminClient();
  const [{ data: documents }, { data: spaces }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, public_slug, is_featured, created_at")
      .eq("visibility", "public")
      .eq("show_in_catalog", true)
      .not("public_slug", "is", null)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("spaces")
      .select("id, name, description, public_slug, is_featured, created_at")
      .eq("visibility", "public")
      .eq("show_in_catalog", true)
      .not("public_slug", "is", null)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  const safeDocuments = (documents ?? []).filter((doc) => Boolean((doc as { public_slug: string | null }).public_slug));
  const safeSpaces = (spaces ?? []).filter((space) => Boolean((space as { public_slug: string | null }).public_slug));

  return {
    source: "supabase" as const,
    documents: safeDocuments,
    spaces: safeSpaces,
    featuredDocuments: safeDocuments.filter((d) => (d as { is_featured: boolean }).is_featured),
    featuredSpaces: safeSpaces.filter((s) => (s as { is_featured: boolean }).is_featured)
  };
}

export function getPublicShareByToken(token: string) {
  const link = mockShareLinks.find((item) => item.token === token);
  if (!link) return null;

  const document = link.documentId ? mockDocuments.find((d) => d.id === link.documentId) ?? null : null;
  const space = link.spaceId ? mockSpaces.find((s) => s.id === link.spaceId) ?? null : null;
  const documents = space ? mockDocuments.filter((doc) => space.documentIds.includes(doc.id)) : [];

  return { link, document, space, documents };
}

export async function getPublicDocumentBySlug(slug: string) {
  if (shouldUseDemoData()) {
    return mockDocuments.find((doc) => doc.visibility === "public" && doc.publicSlug === slug) ?? null;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, storage_path, landing_page, visibility, public_slug")
    .eq("visibility", "public")
    .eq("public_slug", slug)
    .maybeSingle();

  return data;
}

export async function getPublicSpaceBySlug(slug: string) {
  if (shouldUseDemoData()) {
    const space = mockSpaces.find((item) => item.visibility === "public" && item.publicSlug === slug);
    if (!space) return null;
    const docs = mockDocuments.filter((doc) => space.documentIds.includes(doc.id) && doc.visibility === "public");
    return { ...space, documents: docs };
  }

  const supabase = createAdminClient();
  const { data: spaceData } = await supabase
    .from("spaces")
    .select("id, name, description, landing_page, visibility, public_slug")
    .eq("visibility", "public")
    .eq("public_slug", slug)
    .maybeSingle();

  type PublicSpaceRow = Pick<Database["public"]["Tables"]["spaces"]["Row"], "id" | "name" | "description" | "landing_page" | "visibility" | "public_slug">;
  const space = spaceData as PublicSpaceRow | null;

  if (!space) return null;

  const { data: docs } = await supabase
    .from("space_documents")
    .select("position, documents (id, title, visibility)")
    .eq("space_id", (space as { id: string }).id)
    .order("position");

  const mappedDocs = (docs ?? []) as Array<{ documents: { id: string; title: string; visibility: "public" | "private" } | null }>;

  return {
    ...space,
    documents: mappedDocs
      .map((row) => row.documents)
      .filter((row): row is { id: string; title: string; visibility: "public" | "private" } => Boolean(row && row.visibility === "public"))
  };
}
