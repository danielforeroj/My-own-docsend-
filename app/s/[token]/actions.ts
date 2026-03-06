"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkByToken, grantCookieName, validateIntakeValue } from "@/lib/share";

export async function submitIntake(token: string, formData: FormData) {
  const link = await getShareLinkByToken(token);
  if (!link) throw new Error("Invalid share link.");

  const supabase = createAdminClient();

  const { data: fields } = await supabase
    .from("share_link_fields")
    .select("id, field_name, label, field_type, is_required, options, placeholder, position")
    .eq("share_link_id", link.id)
    .order("position");

  const payload: Record<string, string | boolean> = {};

  for (const field of fields ?? []) {
    const result = validateIntakeValue(
      {
        ...field,
        options: Array.isArray(field.options) ? (field.options as string[]) : null
      },
      formData.get(field.field_name)
    );

    if (result.error) {
      throw new Error(result.error);
    }

    payload[field.field_name] = result.value as string | boolean;
  }

  const { data: submission, error: submissionError } = await supabase
    .from("visitor_submissions")
    .insert({
      share_link_id: link.id,
      space_id: link.space_id,
      document_id: link.document_id,
      payload,
      user_agent: formData.get("_ua")?.toString() || null
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    throw new Error(submissionError?.message || "Failed to submit intake form.");
  }

  const accessToken = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  const { error: grantError } = await supabase.from("share_link_access_grants").insert({
    share_link_id: link.id,
    visitor_submission_id: submission.id,
    token: accessToken,
    expires_at: expiresAt
  });

  if (grantError) {
    throw new Error(grantError.message);
  }

  const cookieStore = await cookies();
  cookieStore.set(grantCookieName(link.id), accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt)
  });

  redirect(`/s/${token}`);
}
