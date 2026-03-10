import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteShareLink, updateShareLinkFields } from "@/app/admin/actions";
import { IntakeFieldsEditor, type EditableField } from "@/components/admin/intake-fields-editor";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { DeleteActionButton } from "@/components/admin/delete-action-button";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ShareLinkSettingsPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: linkData }, { data: fieldsData }] = await Promise.all([
    supabase
      .from("share_links")
      .select("id, token, link_type, name, requires_intake, intake_settings")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle(),
    supabase
      .from("share_link_fields")
      .select("field_name, label, field_type, is_required, options, placeholder, help_text, default_value, width, validation_rule")
      .eq("share_link_id", params.id)
      .order("position")
  ]);

  type ShareLinkRow = Pick<
    Database["public"]["Tables"]["share_links"]["Row"],
    "id" | "token" | "name" | "requires_intake" | "intake_settings"
  >;
  type ShareLinkFieldRow = Pick<
    Database["public"]["Tables"]["share_link_fields"]["Row"],
    "field_name" | "label" | "field_type" | "is_required" | "options" | "placeholder" | "help_text" | "default_value" | "width" | "validation_rule"
  >;

  const link = linkData as ShareLinkRow | null;
  const fields = (fieldsData ?? []) as ShareLinkFieldRow[];

  if (!link) notFound();

  const action = updateShareLinkFields.bind(null, link.id);
  const initialFields: EditableField[] = (fields ?? []).map((field) => ({
    field_name: field.field_name,
    label: field.label,
    field_type: field.field_type,
    is_required: field.is_required,
    options: Array.isArray(field.options) ? (field.options as string[]) : null,
    placeholder: field.placeholder,
    help_text: field.help_text,
    default_value: field.default_value,
    width: field.width,
    validation_rule: field.validation_rule
  }));

  const intakeSettings = ((link.intake_settings ?? {}) as Record<string, string | null>) || {};

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/share-links" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to share links
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Share link settings</p>
        <h1 className="mt-1 text-3xl font-semibold">Configure share link</h1>
        <p className="text-muted-foreground">
          Public URL: <code>/s/{link.token}</code>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyLinkButton path={`/s/${link.token}`} label="Copy public link" />
          <form action={deleteShareLink.bind(null, link.id)} className="inline-flex">
            <DeleteActionButton confirmMessage="Delete this share link? This removes related intake fields and grants." />
          </form>
        </div>
      </div>

      <form action={action} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Link settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Internal name</label>
              <input className="w-full" name="name" defaultValue={link.name ?? ""} />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="requires_intake" defaultChecked={link.requires_intake} /> Require intake before access
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Intake experience text</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Headline</label>
              <input name="intake_headline" className="w-full" defaultValue={intakeSettings.headline ?? ""} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea name="intake_description" rows={3} className="w-full" defaultValue={intakeSettings.description ?? ""} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Consent checkbox text</label>
              <input name="intake_consent_text" className="w-full" defaultValue={intakeSettings.consent_text ?? ""} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Success message text</label>
              <input name="intake_success_message" className="w-full" defaultValue={intakeSettings.success_message ?? ""} />
            </div>
          </div>
        </section>

        <IntakeFieldsEditor initialFields={initialFields} />

        <div className="flex justify-end">
          <SubmitButton className="btn-primary" idleLabel="Save configuration" pendingLabel="Saving configuration..." />
        </div>
      </form>
    </div>
  );
}
