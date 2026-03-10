import "server-only";

import { createClientOrNull } from "@/lib/supabase/server";
import { createAdminClient, createAdminClientOrNull } from "@/lib/supabase/admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";
import { mockAnalyticsSummary, mockBrandingSettings, mockDocuments, mockShareLinks, mockSpaces } from "@/lib/data/mock";
import type { Database } from "@/lib/db/types";

export function shouldUseDemoData() {
  return isDemoMode() || !isSupabaseConfigured();
}

function chunk<T>(values: T[], size = 200): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < values.length; i += size) rows.push(values.slice(i, i + size));
  return rows;
}


function parseViewerContext(fingerprint: string | null) {
  if (!fingerprint) return { country: "unknown", region: "unknown", city: "unknown", device: "unknown" };
  const parts = fingerprint.split("|");
  if (parts.length < 5) return { country: "unknown", region: "unknown", city: "unknown", device: "unknown" };
  return {
    country: parts[1] || "unknown",
    region: parts[2] || "unknown",
    city: parts[3] || "unknown",
    device: parts[4] || "unknown"
  };
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

  const [{ data: documents }, { data: spaces }, { data: recentUploads }, { data: recentViews }, { count: leadCount }] = await Promise.all([
    supabase.from("documents").select("id, title, created_at").eq("organization_id", organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", organizationId),
    supabase.from("documents").select("id, title, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(8),
    supabase
      .from("view_sessions")
      .select("id, document_id, space_id, created_at, documents!inner(organization_id)")
      .eq("documents.organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).not("id", "is", null)
  ]);

  return {
    source: "supabase" as const,
    documents: documents ?? [],
    spaces: spaces ?? [],
    recentUploads: recentUploads ?? [],
    recentViews: (recentViews ?? []).map((row: { id: string; document_id: string | null; space_id: string | null; created_at: string }) => row),
    leadCount: leadCount ?? 0
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

  const supabase = createAdminClientOrNull();
  if (!supabase) return { source: "demo" as const, documents: [], spaces: [], totals: { totalViews: 0, uniqueViewers: 0, downloads: 0, submissions: 0, recentVisits: [] }, perDocument: [], perSpace: [] };

  const [{ data: documents }, { data: spaces }] = await Promise.all([
    supabase.from("documents").select("id, title").eq("organization_id", organizationId),
    supabase.from("spaces").select("id, name").eq("organization_id", organizationId)
  ]);

  const safeDocuments = (documents ?? []) as Array<{ id: string; title: string }>;
  const safeSpaces = (spaces ?? []) as Array<{ id: string; name: string }>;

  const documentViewRows: Array<{ id: string; document_id: string | null; created_at: string; started_at: string; ended_at: string | null; viewer_fingerprint: string | null }> = [];
  for (const ids of chunk(safeDocuments.map((item) => item.id))) {
    const { data } = await supabase.from("view_sessions").select("id, document_id, created_at, started_at, ended_at, viewer_fingerprint").in("document_id", ids);
    documentViewRows.push(...((data ?? []) as typeof documentViewRows));
  }

  const spaceViewRows: Array<{ id: string; space_id: string | null; created_at: string; started_at: string; ended_at: string | null; viewer_fingerprint: string | null }> = [];
  for (const ids of chunk(safeSpaces.map((item) => item.id))) {
    const { data } = await supabase.from("view_sessions").select("id, space_id, created_at, started_at, ended_at, viewer_fingerprint").in("space_id", ids);
    spaceViewRows.push(...((data ?? []) as typeof spaceViewRows));
  }

  const downloadRows: Array<{ document_id: string }> = [];
  for (const ids of chunk(safeDocuments.map((item) => item.id))) {
    const { data } = await supabase.from("downloads").select("document_id").in("document_id", ids);
    downloadRows.push(...((data ?? []) as typeof downloadRows));
  }

  const submissionRows: Array<{ space_id: string | null }> = [];
  for (const ids of chunk(safeSpaces.map((item) => item.id))) {
    const { data } = await supabase.from("visitor_submissions").select("space_id").in("space_id", ids);
    submissionRows.push(...((data ?? []) as typeof submissionRows));
  }

  const viewsByDocument = new Map<string, number>();
  for (const row of documentViewRows) {
    if (!row.document_id) continue;
    viewsByDocument.set(row.document_id, (viewsByDocument.get(row.document_id) ?? 0) + 1);
  }

  const viewsBySpace = new Map<string, number>();
  for (const row of spaceViewRows) {
    if (!row.space_id) continue;
    viewsBySpace.set(row.space_id, (viewsBySpace.get(row.space_id) ?? 0) + 1);
  }

  const downloadsByDocument = new Map<string, number>();
  for (const row of downloadRows) {
    downloadsByDocument.set(row.document_id, (downloadsByDocument.get(row.document_id) ?? 0) + 1);
  }

  const submissionsBySpace = new Map<string, number>();
  for (const row of submissionRows) {
    if (!row.space_id) continue;
    submissionsBySpace.set(row.space_id, (submissionsBySpace.get(row.space_id) ?? 0) + 1);
  }

  const totalViews = documentViewRows.length + spaceViewRows.length;
  const uniqueViewerFingerprints = new Set([...documentViewRows, ...spaceViewRows].map((row) => row.viewer_fingerprint).filter(Boolean));

  const documentTitleById = new Map(safeDocuments.map((item) => [item.id, item.title]));
  const spaceNameById = new Map(safeSpaces.map((item) => [item.id, item.name]));

  const recentVisits = [
    ...documentViewRows.map((row) => {
      const context = parseViewerContext(row.viewer_fingerprint);
      const durationSeconds = row.ended_at
        ? Math.max(0, Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 1000))
        : null;
      return {
        id: row.id,
        documentId: row.document_id,
        spaceId: null as string | null,
        targetLabel: row.document_id ? documentTitleById.get(row.document_id) ?? row.document_id : "Unknown document",
        createdAt: row.created_at,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationSeconds,
        country: context.country,
        region: context.region,
        city: context.city,
        device: context.device
      };
    }),
    ...spaceViewRows.map((row) => {
      const context = parseViewerContext(row.viewer_fingerprint);
      const durationSeconds = row.ended_at
        ? Math.max(0, Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 1000))
        : null;
      return {
        id: row.id,
        documentId: null as string | null,
        spaceId: row.space_id,
        targetLabel: row.space_id ? spaceNameById.get(row.space_id) ?? row.space_id : "Unknown space",
        createdAt: row.created_at,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationSeconds,
        country: context.country,
        region: context.region,
        city: context.city,
        device: context.device
      };
    })
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 25);

  return {
    source: "supabase" as const,
    documents: safeDocuments,
    spaces: safeSpaces,
    totals: {
      totalViews,
      uniqueViewers: uniqueViewerFingerprints.size,
      downloads: downloadRows.length,
      submissions: submissionRows.length,
      recentVisits
    },
    perDocument: safeDocuments.map((item) => ({
      id: item.id,
      title: item.title,
      views: viewsByDocument.get(item.id) ?? 0,
      downloads: downloadsByDocument.get(item.id) ?? 0
    })),
    perSpace: safeSpaces.map((item) => ({
      id: item.id,
      name: item.name,
      views: viewsBySpace.get(item.id) ?? 0,
      submissions: submissionsBySpace.get(item.id) ?? 0
    }))
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

  const supabaseAdmin = createAdminClientOrNull();
  if (!supabaseAdmin) return { source: "demo" as const, organizationName: "Demo Organization", members: [], branding: null };

  const [{ data: orgData }, { data: membersData }, { data: profilesData }, usersResponse] = await Promise.all([
    supabaseAdmin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    supabaseAdmin.from("memberships").select("role, user_id").eq("organization_id", organizationId).order("created_at", { ascending: true }),
    supabaseAdmin.from("profiles").select("id, full_name"),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  const org = orgData as Pick<Database["public"]["Tables"]["organizations"]["Row"], "name"> | null;
  const members = (membersData ?? []) as Array<Pick<Database["public"]["Tables"]["memberships"]["Row"], "user_id" | "role">>;
  const profiles = (profilesData ?? []) as Array<Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name">>;
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const users = usersResponse.data?.users ?? [];
  const emailById = new Map(users.map((user) => [user.id, user.email ?? null]));

  return {
    source: "supabase" as const,
    organizationName: org?.name ?? "Not found",
    members: members.map((m) => ({ userId: m.user_id, role: m.role, fullName: profileById.get(m.user_id)?.full_name ?? null, email: emailById.get(m.user_id) ?? null })),
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
