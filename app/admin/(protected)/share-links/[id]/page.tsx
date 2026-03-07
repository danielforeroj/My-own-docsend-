import Link from "next/link";
import { notFound } from "next/navigation";
import { updateShareLinkFields } from "@/app/admin/actions";
import { IntakeFieldsEditor, type EditableField } from "@/components/admin/intake-fields-editor";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function ShareLinkSettingsPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: link }, { data: fields }] = await Promise.all([
    supabase
      .from("share_links")
      .select("id, token, link_type, name, requires_intake")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle(),
    supabase
      .from("share_link_fields")
      .select("field_name, label, field_type, is_required, options, placeholder")
      .eq("share_link_id", params.id)
      .order("position")
  ]);

  if (!link) notFound();

  const action = updateShareLinkFields.bind(null, link.id);
  const initialFields: EditableField[] = (fields ?? []).map((field) => ({
    field_name: field.field_name,
    label: field.label,
    field_type: field.field_type,
    is_required: field.is_required,
    options: Array.isArray(field.options) ? (field.options as string[]) : null,
    placeholder: field.placeholder
  }));

  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/admin/share-links" className="text-sm text-slate-600">
        ← Back to share links
      </Link>
      <h1 className="text-2xl font-semibold">Configure Share Link</h1>
      <p className="text-sm text-slate-600">
        Public URL: <code>/s/{link.token}</code>
      </p>

      <form action={action} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Internal name</label>
          <input className="w-full" name="name" defaultValue={link.name ?? ""} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requires_intake" defaultChecked={link.requires_intake} /> Require intake form before access
        </label>

        <IntakeFieldsEditor initialFields={initialFields} />

        <button className="bg-slate-900 text-white" type="submit">
          Save configuration
        </button>
      </form>
    </div>
  );
}
