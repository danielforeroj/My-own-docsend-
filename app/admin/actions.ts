"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireAdminContext } from "@/lib/auth/server";
import { createClientOrNull } from "@/lib/supabase/server";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";


function shouldDisableMutations() {
  return isDemoMode() || !isSupabaseConfigured();
}

type AllowedFieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
const ALLOWED_FIELD_TYPES = new Set<AllowedFieldType>(["text", "email", "phone", "textarea", "select", "checkbox"]);

function isAllowedFieldType(value: string): value is AllowedFieldType {
  return ALLOWED_FIELD_TYPES.has(value as AllowedFieldType);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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

  for (const index of Array.from({ length: 6 }, (_, i) => i)) {
    const fieldName = String(formData.get(`field_${index}_name`) || "").trim();
    const label = String(formData.get(`field_${index}_label`) || "").trim();
    const fieldTypeRaw = String(formData.get(`field_${index}_type`) || "text").trim();
    const required = formData.get(`field_${index}_required`) === "on";
    const optionsRaw = String(formData.get(`field_${index}_options`) || "").trim();
    const placeholder = String(formData.get(`field_${index}_placeholder`) || "").trim();
    const helpText = String(formData.get(`field_${index}_help_text`) || "").trim();
    const defaultValue = String(formData.get(`field_${index}_default_value`) || "").trim();
    const widthRaw = String(formData.get(`field_${index}_width`) || "full").trim();
    const validationRule = String(formData.get(`field_${index}_validation_rule`) || "").trim();

    if (!fieldName && !label) continue;
    if (!fieldName || !label) throw new Error(`Field ${index + 1}: both field key and label are required.`);
    if (!/^[a-zA-Z][a-zA-Z0-9_]{1,48}$/.test(fieldName)) {
      throw new Error(`Field ${index + 1}: key must be alphanumeric with underscores.`);
    }
    if (!isAllowedFieldType(fieldTypeRaw)) throw new Error(`Field ${index + 1}: invalid field type.`);

    const options =
      fieldTypeRaw === "select"
        ? optionsRaw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : null;

    if (fieldTypeRaw === "select" && (!options || options.length === 0)) {
      throw new Error(`Field ${index + 1}: select fields require at least one option.`);
    }

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

  return rows;
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
  const supabase = await createClientOrNull();
  if (!supabase) return;

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const documentIds = formData.getAll("document_ids").map(String);

  if (!name) throw new Error("Space name is required.");

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .insert({
      organization_id: ctx.organizationId,
      created_by: ctx.userId,
      name,
      slug,
      description: description || null
    })
    .select("id")
    .single();

  if (spaceError || !space) throw new Error(spaceError?.message ?? "Failed to create space");

  if (documentIds.length > 0) {
    const { error: joinError } = await supabase.from("space_documents").insert(
      documentIds.map((documentId, index) => ({ space_id: space.id, document_id: documentId, position: index }))
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

  await requireAdminContext();
  const supabase = await createClientOrNull();
  if (!supabase) return;

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const active = formData.get("is_active") === "on";
  const documentIds = formData.getAll("document_ids").map(String);

  if (!name) throw new Error("Space name is required.");

  const { error: updateError } = await supabase
    .from("spaces")
    .update({ name, description: description || null, is_active: active, updated_at: new Date().toISOString() })
    .eq("id", spaceId);
  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await supabase.from("space_documents").delete().eq("space_id", spaceId);
  if (deleteError) throw new Error(deleteError.message);

  if (documentIds.length > 0) {
    const { error: joinError } = await supabase.from("space_documents").insert(
      documentIds.map((documentId, index) => ({ space_id: spaceId, document_id: documentId, position: index }))
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
  const supabase = await createClientOrNull();
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

  const token = randomUUID().replace(/-/g, "");

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

  await requireAdminContext();
  const supabase = await createClientOrNull();
  if (!supabase) return;

  const name = String(formData.get("name") || "").trim();
  const requiresIntake = formData.get("requires_intake") === "on";
  const intakeSettings = {
    headline: String(formData.get("intake_headline") || "").trim() || null,
    description: String(formData.get("intake_description") || "").trim() || null,
    consent_text: String(formData.get("intake_consent_text") || "").trim() || null,
    success_message: String(formData.get("intake_success_message") || "").trim() || null
  };

  const { error: linkError } = await supabase
    .from("share_links")
    .update({ name: name || null, requires_intake: requiresIntake, intake_settings: intakeSettings })
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
  const supabase = await createClientOrNull();
  if (!supabase) return;

  const landingPage = parseLandingForm(formData);

  const { error } = await supabase
    .from("documents")
    .update({ landing_page: landingPage })
    .eq("id", documentId)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/documents/${documentId}`);
}

export async function updateSpaceLanding(spaceId: string, formData: FormData) {
  if (shouldDisableMutations()) {
    revalidatePath("/admin/spaces");
    return;
  }

  const ctx = await requireAdminContext();
  const supabase = await createClientOrNull();
  if (!supabase) return;

  const landingPage = parseLandingForm(formData);

  const { error } = await supabase
    .from("spaces")
    .update({ landing_page: landingPage, updated_at: new Date().toISOString() })
    .eq("id", spaceId)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/spaces/${spaceId}`);
}
