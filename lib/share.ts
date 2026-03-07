import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { FieldType } from "@/lib/db/types";

export type ShareField = {
  id: string;
  field_name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  placeholder: string | null;
  help_text?: string | null;
  default_value?: string | null;
  width?: "full" | "half";
  validation_rule?: string | null;
  position: number;
};

const SHARE_TOKEN_REGEX = /^[a-f0-9]{32}$/i;

export function isValidShareToken(token: string) {
  return SHARE_TOKEN_REGEX.test(token);
}

export function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

export async function getShareLinkByToken(token: string) {
  if (!isValidShareToken(token)) {
    return null;
  }

  const supabase = createAdminClient();
  const { data: link } = await supabase
    .from("share_links")
    .select("id, link_type, token, requires_intake, space_id, document_id, organization_id, expires_at, name, intake_settings")
    .eq("token", token)
    .maybeSingle();

  if (!link || isExpired(link.expires_at)) {
    return null;
  }

  return link;
}

export function grantCookieName(shareLinkId: string) {
  return `sl_access_${shareLinkId}`;
}

export async function getValidAccessGrant(shareLinkId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(grantCookieName(shareLinkId))?.value;
  if (!token) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("share_link_access_grants")
    .select("id, expires_at, visitor_submission_id")
    .eq("share_link_id", shareLinkId)
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data;
}

export function validateIntakeValue(field: ShareField, value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";

  if (field.field_type === "checkbox") {
    const checked = value === "on";
    if (field.is_required && !checked) {
      return { error: `${field.label} is required.` };
    }
    return { value: checked };
  }

  if (field.is_required && !raw) {
    return { error: `${field.label} is required.` };
  }

  if (!raw) {
    return { value: "" };
  }

  if (field.field_type === "email" && !/^\S+@\S+\.\S+$/.test(raw)) {
    return { error: `${field.label} must be a valid email.` };
  }

  if (field.field_type === "phone" && !/^[+()\-\s\d]{7,20}$/.test(raw)) {
    return { error: `${field.label} must be a valid phone.` };
  }

  if (field.field_type === "select" && field.options?.length && !field.options.includes(raw)) {
    return { error: `${field.label} has an invalid option.` };
  }

  if (field.validation_rule) {
    try {
      const regex = new RegExp(field.validation_rule);
      if (!regex.test(raw)) {
        return { error: `${field.label} format is invalid.` };
      }
    } catch {
      // ignore invalid admin-provided regex
    }
  }

  return { value: raw };
}
