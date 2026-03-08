import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSpace } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function EditSpacePage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: space }, { data: documents }, { data: selected }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, name, description, is_active")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle(),
    supabase.from("documents").select("id, title").eq("organization_id", ctx.organizationId),
    supabase.from("space_documents").select("document_id").eq("space_id", params.id)
  ]);

  if (!space) notFound();

  const selectedIds = new Set(selected?.map((item) => item.document_id));
  const action = updateSpace.bind(null, space.id);

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/spaces" className="text-sm text-slate-600">
        ← Back to spaces
      </Link>
      <h1 className="text-2xl font-semibold">Edit Space</h1>

      <form action={action} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Name</label>
          <input name="name" defaultValue={space.name} required className="w-full" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Description</label>
          <textarea name="description" defaultValue={space.description ?? ""} className="w-full" rows={4} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={space.is_active} /> Active
        </label>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Documents in this space</label>
          <div className="space-y-2">
            {documents?.map((document) => (
              <label key={document.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="document_ids"
                  value={document.id}
                  defaultChecked={selectedIds.has(document.id)}
                />
                {document.title}
              </label>
            ))}
          </div>
        </div>

        <button className="bg-slate-900 text-white" type="submit">
          Save changes
        </button>
      </form>
    </div>
  );
}
