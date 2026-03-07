import Link from "next/link";
import { notFound } from "next/navigation";
import { submitIntake } from "@/app/s/[token]/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkByToken, getValidAccessGrant, ShareField } from "@/lib/share";

async function getFields(shareLinkId: string): Promise<ShareField[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("share_link_fields")
    .select("id, field_name, label, field_type, is_required, options, placeholder, position")
    .eq("share_link_id", shareLinkId)
    .order("position");

  return (data ?? []).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? (row.options as string[]) : null
  }));
}

function FieldRenderer({ field }: { field: ShareField }) {
  const commonProps = {
    name: field.field_name,
    required: field.is_required,
    className: "w-full",
    placeholder: field.placeholder ?? undefined
  };

  if (field.field_type === "textarea") {
    return <textarea {...commonProps} rows={4} />;
  }

  if (field.field_type === "select") {
    return (
      <select name={field.field_name} required={field.is_required} className="w-full" defaultValue="">
        <option value="" disabled>
          Select option
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={field.field_name} required={field.is_required} /> {field.label}
      </label>
    );
  }

  const type = field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text";
  return <input type={type} {...commonProps} />;
}

export default async function PublicSharePage({ params }: { params: { token: string } }) {
  const link = await getShareLinkByToken(params.token);
  if (!link) notFound();

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return <main className="mx-auto max-w-2xl p-6">This share link has expired.</main>;
  }

  const [accessGrant, fields] = await Promise.all([getValidAccessGrant(link.id), getFields(link.id)]);

  if (link.requires_intake && !accessGrant) {
    const action = submitIntake.bind(null, params.token);

    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Access Request</h1>
          <p className="text-sm text-slate-600">Please complete the intake form to access this shared content.</p>

          <form action={action} className="space-y-4">
            <input type="hidden" name="_ua" value="public-browser" />
            {fields.map((field) => (
              <div className="space-y-1" key={field.id}>
                {field.field_type !== "checkbox" ? (
                  <label className="block text-sm font-medium">
                    {field.label}
                    {field.is_required ? " *" : ""}
                  </label>
                ) : null}
                <FieldRenderer field={field} />
              </div>
            ))}
            {!fields.length ? <p className="text-sm text-slate-500">No custom fields configured.</p> : null}
            <button type="submit" className="bg-slate-900 text-white">
              Continue
            </button>
          </form>
        </div>
      </main>
    );
  }

  const supabase = createAdminClient();

  if (link.link_type === "document" && link.document_id) {
    const { data: document } = await supabase
      .from("documents")
      .select("id, title, storage_path")
      .eq("id", link.document_id)
      .maybeSingle();

    if (!document) notFound();

    const { data: signedUrl } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 60);

    await supabase.from("view_sessions").insert({
      space_id: null,
      document_id: document.id,
      visitor_submission_id: accessGrant?.visitor_submission_id ?? null,
      started_at: new Date().toISOString()
    });

    return (
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">{document.title}</h1>
        {signedUrl?.signedUrl ? (
          <iframe title={document.title} src={signedUrl.signedUrl} className="h-[80vh] w-full rounded border border-slate-200" />
        ) : (
          <p className="text-sm text-slate-600">Unable to load document preview.</p>
        )}
        <div className="flex gap-4">
          <Link className="underline" href={`/s/${params.token}/download/${document.id}`}>
            Download tracked file
          </Link>
          {signedUrl?.signedUrl ? (
            <Link className="underline" href={signedUrl.signedUrl} target="_blank">
              Open in new tab
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  if (link.link_type === "space" && link.space_id) {
    const [{ data: space }, { data: docs }] = await Promise.all([
      supabase.from("spaces").select("id, name, description").eq("id", link.space_id).maybeSingle(),
      supabase
        .from("space_documents")
        .select("position, documents (id, title, storage_path)")
        .eq("space_id", link.space_id)
        .order("position")
    ]);

    if (!space) notFound();

    const docRows = ((docs ?? []) as Array<{ documents: { id: string; title: string; storage_path: string } | null }>).map(
      (row) => row.documents
    );

    await supabase.from("view_sessions").insert({
      space_id: space.id,
      document_id: null,
      visitor_submission_id: accessGrant?.visitor_submission_id ?? null,
      started_at: new Date().toISOString()
    });

    return (
      <main className="mx-auto max-w-4xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">{space.name}</h1>
        {space.description ? <p className="text-slate-600">{space.description}</p> : null}

        <div className="space-y-2 rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold">Documents</h2>
          {docRows.filter(Boolean).map((doc) => (
            <div className="flex items-center justify-between border-b border-slate-200 py-2 last:border-b-0" key={doc!.id}>
              <span>{doc!.title}</span>
              <div className="space-x-3">
                <Link className="underline" href={`/s/${params.token}/download/${doc!.id}`}>
                  Download tracked
                </Link>
              </div>
            </div>
          ))}
          {!docRows.filter(Boolean).length ? <p className="text-sm text-slate-500">No documents in this space.</p> : null}
        </div>
      </main>
    );
  }

  notFound();
}
