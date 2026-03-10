"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireAdminContext } from "@/lib/auth/server";
import { createClientOrNull } from "@/lib/supabase/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";
import { normalizeSlug } from "@/lib/slug";



export type AdminActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

class AdminFormError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]>) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

async function withActionState(run: () => Promise<void>, successMessage: string): Promise<AdminActionState> {
  try {
    await run();
    return { ok: true, message: successMessage };
  } catch (error) {
    if (error instanceof AdminFormError) {
      return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
    }

    const message = error instanceof Error ? error.message : "Something went wrong.";
    return { ok: false, message };
  }
}

function shouldDisableMutations() {
  return isDemoMode() || !isSupabaseConfigured();
}

function getAdminMutationClientOrThrow(preferAdmin = true) {
  const admin = createAdminClientOrNull() as any;
  if (preferAdmin && admin) return admin;
  return null;
}

type AllowedFieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
const ALLOWED_FIELD_TYPES = new Set<AllowedFieldType>(["text", "email", "phone", "textarea", "select", "checkbox"]);

function isAllowedFieldType(value: string): value is AllowedFieldType {
  return ALLOWED_FIELD_TYPES.has(value as AllowedFieldType);
}

const slugify = normalizeSlug;

function parseStringList(value: string) {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseFieldRows(formData: FormData) {
  const rows: Array<{
    field_name: string;
    label: string;
    field_type: AllowedFieldType;
    is_required: boolean;
    options: string[] | null;
    placeholder: string | null;
    help_text: string | null;
    default_value: string | null;
    width: "full" | "half";
    validation_rule: string | null;
    position: number;
  }> = [];

  const fieldCountRaw = Number(formData.get("field_count") || 0);
  const fieldCount = Number.isFinite(fieldCountRaw) ? Math.min(24, Math.max(0, Math.round(fieldCountRaw))) : 0;

  for (const index of Array.from({ length: fieldCount }, (_, i) => i)) {
    const fieldNameRaw = String(formData.get(`field_${index}_name`) || "").trim();
    const labelRaw = String(formData.get(`field_${index}_label`) || "").trim();
    const fieldTypeRaw = String(formData.get(`field_${index}_type`) || "text").trim();
    const required = formData.get(`field_${index}_required`) === "on";
    const optionsRaw = String(formData.get(`field_${index}_options`) || "").trim();
    const placeholder = String(formData.get(`field_${index}_placeholder`) || "").trim();
    const helpText = String(formData.get(`field_${index}_help_text`) || "").trim();
    const defaultValue = String(formData.get(`field_${index}_default_value`) || "").trim();
    const widthRaw = String(formData.get(`field_${index}_width`) || "full").trim();
    const validationPresetRaw = String(formData.get(`field_${index}_validation_rule`) || "none").trim();

    const label = labelRaw || fieldNameRaw.replace(/_/g, " ");
    const generatedKey =
      fieldNameRaw ||
      label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 48);
    const fieldName = generatedKey;

    if (!fieldName && !label) continue;
    if (!fieldName || !label) throw new Error(`Field ${index + 1}: a field label is required.`);
    if (!/^[a-zA-Z][a-zA-Z0-9_]{1,48}$/.test(fieldName)) {
      throw new Error(`Field ${index + 1}: key must be alphanumeric with underscores.`);
    }
    if (!isAllowedFieldType(fieldTypeRaw)) throw new Error(`Field ${index + 1}: invalid field type.`);

    const options =
      fieldTypeRaw === "select"
        ? optionsRaw
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : null;

    if (fieldTypeRaw === "select" && (!options || options.length === 0)) {
      throw new Error(`Field ${index + 1}: select fields require at least one option.`);
    }

    const validationRule =
      validationPresetRaw === "email"
        ? "preset:email"
        : validationPresetRaw === "phone"
          ? "preset:phone"
          : validationPresetRaw === "required_text"
            ? "preset:required_text"
            : validationPresetRaw === "optional_text"
              ? "preset:optional_text"
              : null;

    rows.push({
      field_name: fieldName,
      label,
      field_type: fieldTypeRaw,
      is_required: required,
      options,
      placeholder: placeholder || null,
      help_text: helpText || null,
      default_value: defaultValue || null,
      width: widthRaw === "half" ? "half" : "full",
      validation_rule: validationRule || null,
      position: index
    });
  }

  const duplicateKey = rows.find((row, index) => rows.findIndex((item) => item.field_name === row.field_name) !== index);
  if (duplicateKey) {
    throw new Error(`Field keys must be unique. Duplicate key: ${duplicateKey.field_name}`);
  }

  return rows;
}


function parseVisibilityForm(formData: FormData) {
  const visibilityRaw = String(formData.get("visibility") || "private").trim();
  const visibility = visibilityRaw === "public" ? "public" : "private";
  const publicSlugRaw = String(formData.get("public_slug") || "").trim();
  const publicSlug = publicSlugRaw ? slugify(publicSlugRaw) : null;
  const showInCatalog = formData.get("show_in_catalog") === "on";
  const isFeatured = formData.get("is_featured") === "on";

  if (visibility === "public" && !publicSlug) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      public_slug: ["Public URL slug is required when visibility is public."]
    });
  }

  return {
    visibility,
    public_slug: publicSlug,
    show_in_catalog: visibility === "public" ? showInCatalog : false,
    is_featured: visibility === "public" ? isFeatured : false
  };
}

async function ensureUniquePublicSlug({
  supabase,
  table,
  organizationId,
  slug,
  excludeId
}: {
  supabase: any;
  table: "documents" | "spaces";
  organizationId: string;
  slug: string | null;
  excludeId?: string;
}) {
  if (!slug) return;
  let query = supabase.from(table).select("id").eq("organization_id", organizationId).eq("public_slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  if (data?.length) {
    throw new AdminFormError(`That ${table === "documents" ? "document" : "space"} URL slug is already in use.`, {
      public_slug: ["This slug is already taken in your workspace."]
    });
  }
}

function parseViewerForm(formData: FormData) {
  const viewerModeRaw = String(formData.get("viewer_mode") || "document").trim();
  const viewerMode = viewerModeRaw === "deck" ? "deck" : "document";

  const viewerPageCountRaw = Number(formData.get("viewer_page_count") || 12);
  const safePageCount = Number.isFinite(viewerPageCountRaw) ? Math.min(300, Math.max(1, Math.round(viewerPageCountRaw))) : 12;

  return {
    viewer_mode: viewerMode,
    viewer_page_count: safePageCount
  };
}


function parseShareLinkPathSegment(value: FormDataEntryValue | null) {
  const normalized = slugify(String(value || "").trim());
  if (!normalized) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      share_path: ["Share URL path is required."]
    });
  }

  if (normalized.length < 3 || normalized.length > 64) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      share_path: ["Use 3-64 characters with lowercase letters, numbers, and hyphens."]
    });
  }

  return normalized;
}

async function ensureUniqueShareLinkPath({ supabase, organizationId, pathSegment, excludeId }: { supabase: any; organizationId: string; pathSegment: string; excludeId?: string }) {
  let query = supabase.from("share_links").select("id").eq("organization_id", organizationId).eq("token", pathSegment).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data?.length) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      share_path: ["That share URL path is already in use."]
    });
  }
}

function parseLandingForm(formData: FormData) {
  return {
    page_title: String(formData.get("landing_page_title") || "").trim() || null,
    short_description: String(formData.get("landing_short_description") || "").trim() || null,
    eyebrow: String(formData.get("landing_eyebrow") || "").trim() || null,
    hero_image_url: String(formData.get("landing_hero_image") || "").trim() || null,
    logo_url: String(formData.get("landing_logo") || "").trim() || null,
    cta_label: String(formData.get("landing_cta_label") || "").trim() || null,
    cta_url: String(formData.get("landing_cta_url") || "").trim() || null,
    sidebar_info: String(formData.get("landing_sidebar_info") || "").trim() || null,
    disclaimer: String(formData.get("landing_disclaimer") || "").trim() || null,
    highlights: parseStringList(String(formData.get("landing_highlights") || "")),
    about: String(formData.get("landing_about") || "").trim() || null,
    footer_text: String(formData.get("landing_footer_text") || "").trim() || null,
    layout_variant: String(formData.get("landing_layout_variant") || "centered_hero"),
    show_disclaimer: formData.get("landing_show_disclaimer") === "on",
    show_sidebar: formData.get("landing_show_sidebar") === "on",
    show_about: formData.get("landing_show_about") === "on",
    show_highlights: formData.get("landing_show_highlights") === "on"
  };
}

export async function createSpace(formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/spaces");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow();
  const userScopedSupabase = (await createClientOrNull()) as any;
  const db = supabase ?? userScopedSupabase;
  if (!db) throw new Error("Could not initialize a database client for space creation.");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const publicSlugRaw = String(formData.get("public_slug") || "").trim();
  const publicSlug = publicSlugRaw ? slugify(publicSlugRaw) : null;
  const documentIds = formData.getAll("document_ids").map(String);

  if (!name || !publicSlug) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      ...(name ? {} : { name: ["Space name is required."] }),
      ...(publicSlug ? {} : { public_slug: ["Space URL slug is required."] })
    });
  }

  await ensureUniquePublicSlug({ supabase: db, table: "spaces", organizationId: ctx.organizationId, slug: publicSlug });

  const internalSlug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: space, error: spaceError } = await db
    .from("spaces")
    .insert({
      organization_id: ctx.organizationId,
      created_by: ctx.userId,
      name,
      slug: internalSlug,
      description: description || null,
      public_slug: publicSlug
    })
    .select("id")
    .single();

  if (spaceError || !space) throw new Error(spaceError?.message ?? "Failed to create space");

  if (documentIds.length > 0) {
    const uniqueDocumentIds = Array.from(new Set(documentIds));
    const { data: existingDocs, error: docsError } = await db
      .from("documents")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .in("id", uniqueDocumentIds);
    if (docsError) throw new Error(`Failed to validate selected documents: ${docsError.message}`);

    if ((existingDocs ?? []).length !== uniqueDocumentIds.length) {
      throw new AdminFormError("One or more selected documents are invalid for this organization.", {
        document_ids: ["Please select valid documents from your organization."]
      });
    }

    const { error: joinError } = await db.from("space_documents").insert(
      uniqueDocumentIds.map((documentId, index) => ({ space_id: space.id, document_id: documentId, position: index }))
    );
    if (joinError) throw new Error(joinError.message);
  }

  revalidatePath("/admin/spaces");
}

export async function updateSpace(spaceId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/spaces");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow();
  const userScopedSupabase = (await createClientOrNull()) as any;
  const db = supabase ?? userScopedSupabase;
  if (!db) throw new Error("Could not initialize a database client for space update.");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const publicSlugRaw = String(formData.get("public_slug") || "").trim();
  const publicSlug = publicSlugRaw ? slugify(publicSlugRaw) : null;
  const active = formData.get("is_active") === "on";
  const documentIds = formData.getAll("document_ids").map(String);

  if (!name || !publicSlug) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      ...(name ? {} : { name: ["Space name is required."] }),
      ...(publicSlug ? {} : { public_slug: ["Space URL slug is required."] })
    });
  }

  await ensureUniquePublicSlug({ supabase: db, table: "spaces", organizationId: ctx.organizationId, slug: publicSlug, excludeId: spaceId });

  const { data: ownedSpace, error: ownedSpaceError } = await db
    .from("spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (ownedSpaceError) throw new Error(ownedSpaceError.message);
  if (!ownedSpace) throw new Error("Space not found.");

  const { error: updateError } = await db
    .from("spaces")
    .update({ name, description: description || null, public_slug: publicSlug, is_active: active, updated_at: new Date().toISOString() })
    .eq("id", spaceId)
    .eq("organization_id", ctx.organizationId);
  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await db.from("space_documents").delete().eq("space_id", spaceId);
  if (deleteError) throw new Error(deleteError.message);

  if (documentIds.length > 0) {
    const uniqueDocumentIds = Array.from(new Set(documentIds));
    const { data: existingDocs, error: docsError } = await db
      .from("documents")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .in("id", uniqueDocumentIds);
    if (docsError) throw new Error(`Failed to validate selected documents: ${docsError.message}`);

    if ((existingDocs ?? []).length !== uniqueDocumentIds.length) {
      throw new AdminFormError("One or more selected documents are invalid for this organization.", {
        document_ids: ["Please select valid documents from your organization."]
      });
    }

    const { error: joinError } = await db.from("space_documents").insert(
      uniqueDocumentIds.map((documentId, index) => ({ space_id: spaceId, document_id: documentId, position: index }))
    );
    if (joinError) throw new Error(joinError.message);
  }

  revalidatePath("/admin/spaces");
}

export async function createShareLink(formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/share-links");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow() ?? ((await createClientOrNull()) as any);
  if (!supabase) return;

  const targetType = String(formData.get("target_type") || "");
  const targetId = String(formData.get("target_id") || "");
  const name = String(formData.get("name") || "").trim();
  const requiresIntake = formData.get("requires_intake") === "on";
  if (!["space", "document"].includes(targetType) || !targetId) throw new Error("Invalid share target.");

  const targetLookup =
    targetType === "space"
      ? await supabase.from("spaces").select("id").eq("id", targetId).eq("organization_id", ctx.organizationId).maybeSingle()
      : await supabase.from("documents").select("id").eq("id", targetId).eq("organization_id", ctx.organizationId).maybeSingle();
  if (!targetLookup.data) throw new Error("Target not found.");

  const customPathRaw = formData.get("share_path");
  const token = customPathRaw ? parseShareLinkPathSegment(customPathRaw) : randomUUID().replace(/-/g, "");
  await ensureUniqueShareLinkPath({ supabase, organizationId: ctx.organizationId, pathSegment: token });

  const intakeSettings = {
    headline: String(formData.get("intake_headline") || "").trim() || null,
    description: String(formData.get("intake_description") || "").trim() || null,
    consent_text: String(formData.get("intake_consent_text") || "").trim() || null,
    success_message: String(formData.get("intake_success_message") || "").trim() || null
  };

  const insertPayload: Record<string, unknown> = {
    organization_id: ctx.organizationId,
    link_type: targetType,
    created_by: ctx.userId,
    token,
    name: name || null,
    requires_intake: requiresIntake,
    intake_settings: intakeSettings
  };
  if (targetType === "space") insertPayload.space_id = targetId;
  if (targetType === "document") insertPayload.document_id = targetId;

  const { data: link, error } = await supabase.from("share_links").insert(insertPayload).select("id").single();
  if (error || !link) throw new Error(error?.message || "Failed to create share link.");

  const fields = parseFieldRows(formData);
  if (fields.length) {
    const { error: fieldError } = await supabase
      .from("share_link_fields")
      .insert(fields.map((field) => ({ ...field, share_link_id: link.id })));
    if (fieldError) throw new Error(fieldError.message);
  }

  revalidatePath("/admin/share-links");
}

export async function updateShareLinkFields(shareLinkId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/share-links");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow() ?? ((await createClientOrNull()) as any);
  if (!supabase) return;

  const { data: ownedLink, error: ownedLinkError } = await supabase
    .from("share_links")
    .select("id, token")
    .eq("id", shareLinkId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (ownedLinkError) throw new Error(ownedLinkError.message);
  if (!ownedLink) throw new Error("Share link not found.");

  const name = String(formData.get("name") || "").trim();
  const requiresIntake = formData.get("requires_intake") === "on";
  const sharePathRaw = formData.get("share_path");
  const sharePath = sharePathRaw ? parseShareLinkPathSegment(sharePathRaw) : (ownedLink as { token: string }).token;
  await ensureUniqueShareLinkPath({ supabase, organizationId: ctx.organizationId, pathSegment: sharePath, excludeId: shareLinkId });
  const intakeSettings = {
    headline: String(formData.get("intake_headline") || "").trim() || null,
    description: String(formData.get("intake_description") || "").trim() || null,
    consent_text: String(formData.get("intake_consent_text") || "").trim() || null,
    success_message: String(formData.get("intake_success_message") || "").trim() || null
  };

  const { error: linkError } = await supabase
    .from("share_links")
    .update({ token: sharePath, name: name || null, requires_intake: requiresIntake, intake_settings: intakeSettings })
    .eq("id", shareLinkId);
  if (linkError) throw new Error(linkError.message);

  const { error: deleteError } = await supabase.from("share_link_fields").delete().eq("share_link_id", shareLinkId);
  if (deleteError) throw new Error(deleteError.message);

  const fields = parseFieldRows(formData);
  if (fields.length) {
    const { error: fieldError } = await supabase
      .from("share_link_fields")
      .insert(fields.map((field) => ({ ...field, share_link_id: shareLinkId })));
    if (fieldError) throw new Error(fieldError.message);
  }

  revalidatePath("/admin/share-links");
}

export async function updateDocumentLanding(documentId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/documents");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow() ?? ((await createClientOrNull()) as any);
  if (!supabase) return;

  const landingPage = parseLandingForm(formData);

  const { data: existingData } = await supabase
    .from("documents")
    .select("landing_page")
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  const existingLanding = (existingData?.landing_page ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("documents")
    .update({ landing_page: { ...existingLanding, ...landingPage } })
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/documents/${documentId}`);
  revalidatePath("/admin/documents");
}


export async function updateSpaceLanding(spaceId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/spaces");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow() ?? ((await createClientOrNull()) as any);
  if (!supabase) return;

  const landingPage = parseLandingForm(formData);

  const { data: existingData } = await supabase
    .from("spaces")
    .select("landing_page")
    .eq("id", spaceId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  const existingLanding = (existingData?.landing_page ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("spaces")
    .update({ landing_page: { ...existingLanding, ...landingPage }, updated_at: new Date().toISOString() })
    .eq("id", spaceId)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/spaces/${spaceId}`);
  revalidatePath("/admin/spaces");
}



export async function updateDocumentVisibility(documentId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/documents");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow() ?? ((await createClientOrNull()) as any);
  if (!supabase) return;

  const payload = parseVisibilityForm(formData);
  const viewerSettings = parseViewerForm(formData);
  await ensureUniquePublicSlug({ supabase, table: "documents", organizationId: ctx.organizationId, slug: payload.public_slug, excludeId: documentId });

  const { data: existingData } = await supabase
    .from("documents")
    .select("landing_page")
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  const existingLanding = (existingData?.landing_page ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("documents")
    .update({ ...payload, landing_page: { ...existingLanding, ...viewerSettings } })
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/documents/${documentId}`);
  revalidatePath("/admin/documents");
}


export async function updateSpaceVisibility(spaceId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/spaces");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = getAdminMutationClientOrThrow() ?? ((await createClientOrNull()) as any);
  if (!supabase) return;

  const payload = parseVisibilityForm(formData);
  await ensureUniquePublicSlug({ supabase, table: "spaces", organizationId: ctx.organizationId, slug: payload.public_slug, excludeId: spaceId });

  const { error } = await supabase
    .from("spaces")
    .update(payload)
    .eq("id", spaceId)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/spaces/${spaceId}`);
  revalidatePath("/admin/spaces");
}




export async function createEmployeeUser(formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/settings");
    return;
  }

  const ctx = await requireAdminContext();
  if (ctx.role !== "super_admin") {
    throw new Error("Only super admins can create employee users.");
  }

  const supabase = createAdminClientOrNull() as any;
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const roleRaw = String(formData.get("role") || "admin").trim();
  const role = roleRaw === "super_admin" ? "super_admin" : "admin";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      email: ["A valid email is required."]
    });
  }

  if (!fullName) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      full_name: ["Full name is required."]
    });
  }

  if (password.length < 8) {
    throw new AdminFormError("Please fix the highlighted fields.", {
      password: ["Password must be at least 8 characters."]
    });
  }

  const { data: createdUser, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (userError || !createdUser.user) {
    throw new Error(userError?.message ?? "Failed to create user.");
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: createdUser.user.id,
    full_name: fullName,
    updated_at: new Date().toISOString()
  });
  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", createdUser.user.id)
    .maybeSingle();

  if (membershipLookupError) {
    throw new Error(membershipLookupError.message);
  }

  const membershipMutation = existingMembership
    ? await supabase
        .from("memberships")
        .update({ role })
        .eq("id", existingMembership.id)
    : await supabase.from("memberships").insert({
        organization_id: ctx.organizationId,
        user_id: createdUser.user.id,
        role
      });

  if (membershipMutation.error) {
    throw new Error(membershipMutation.error.message);
  }

  revalidatePath("/admin/settings");
}

export async function createSpaceActionState(prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => createSpace(formData), "Space created.");
}


export async function createEmployeeUserActionState(prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => createEmployeeUser(formData), "Employee user created.");
}

export async function updateSpaceActionState(spaceId: string, prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => updateSpace(spaceId, formData), "Space updated.");
}

export async function updateDocumentVisibilityActionState(documentId: string, prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => updateDocumentVisibility(documentId, formData), "Visibility updated.");
}

export async function updateSpaceVisibilityActionState(spaceId: string, prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => updateSpaceVisibility(spaceId, formData), "Visibility updated.");
}

export async function updateDocumentLandingActionState(documentId: string, prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => updateDocumentLanding(documentId, formData), "Landing config updated.");
}

export async function updateSpaceLandingActionState(spaceId: string, prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  void prev;
  return withActionState(() => updateSpaceLanding(spaceId, formData), "Landing config updated.");
}

export async function deleteDocument(documentId: string) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/documents");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = (await createClientOrNull()) as any;
  if (!supabase) return;

  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (!doc) throw new Error("Document not found.");

  const { data: shareLinks } = await supabase
    .from("share_links")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("document_id", documentId);
  const shareLinkIds = (shareLinks ?? []).map((item: { id: string }) => item.id);

  if (shareLinkIds.length) {
    await supabase.from("share_link_fields").delete().in("share_link_id", shareLinkIds);
    await supabase.from("share_link_access_grants").delete().in("share_link_id", shareLinkIds);
    await supabase.from("visitor_submissions").delete().in("share_link_id", shareLinkIds);
    await supabase.from("share_links").delete().in("id", shareLinkIds);
  }

  await supabase.from("space_documents").delete().eq("document_id", documentId);
  await supabase.from("downloads").delete().eq("document_id", documentId);
  await supabase.from("view_sessions").delete().eq("document_id", documentId);
  await supabase.from("visitor_submissions").delete().eq("document_id", documentId);

  const { error: deleteDocError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId);
  if (deleteDocError) throw new Error(deleteDocError.message);

  await supabase.storage.from("documents").remove([doc.storage_path]);

  revalidatePath("/admin/documents");
  revalidatePath("/admin/share-links");
}

export async function deleteDocumentActionState(documentId: string, prev: AdminActionState): Promise<AdminActionState> {
  void prev;
  return withActionState(() => deleteDocument(documentId), "Document deleted.");
}

export async function deleteShareLink(shareLinkId: string) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/share-links");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = (await createClientOrNull()) as any;
  if (!supabase) return;

  const { data: link } = await supabase
    .from("share_links")
    .select("id, token")
    .eq("id", shareLinkId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (!link) throw new Error("Share link not found.");

  await supabase.from("share_link_fields").delete().eq("share_link_id", shareLinkId);
  await supabase.from("share_link_access_grants").delete().eq("share_link_id", shareLinkId);
  await supabase.from("visitor_submissions").delete().eq("share_link_id", shareLinkId);

  const { error } = await supabase.from("share_links").delete().eq("id", shareLinkId).eq("organization_id", ctx.organizationId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/share-links");
}

export async function deleteShareLinkActionState(shareLinkId: string, prev: AdminActionState): Promise<AdminActionState> {
  void prev;
  return withActionState(() => deleteShareLink(shareLinkId), "Share link deleted.");
}
