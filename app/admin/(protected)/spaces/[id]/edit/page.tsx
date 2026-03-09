import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSpace } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function EditSpacePage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const [{ data: spaceData, error: spaceError }, { data: documentsData, error: documentsError }, { data: selectedData, error: selectedError }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, name, description, is_active")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle(),
    supabase.from("documents").select("id, title").eq("organization_id", ctx.organizationId),
    supabase.from("space_documents").select("document_id").eq("space_id", params.id)
  ]);

  type SpaceRow = Pick<Database["public"]["Tables"]["spaces"]["Row"], "id" | "name" | "description" | "is_active">;
  type DocumentRow = Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title">;
  type SpaceDocumentRow = Pick<Database["public"]["Tables"]["space_documents"]["Row"], "document_id">;

  const space = spaceData as SpaceRow | null;
  const documents = (documentsData ?? []) as DocumentRow[];
  const selected = (selectedData ?? []) as SpaceDocumentRow[];

  if (spaceError) {
    throw new Error(`Could not load space: ${spaceError.message}${spaceError.code ? ` (code: ${spaceError.code})` : ""}`);
  }

  if (!space) notFound();

  const selectedIds = new Set(selected?.map((item) => item.document_id));
  const action = updateSpace.bind(null, space.id);

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/spaces" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to spaces
      </Link>
      <h1 className="text-2xl font-semibold">Edit Space</h1>

      {(documentsError || selectedError) ? (
        <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold text-red-300">Some document assignment data could not be loaded.</p>
          {documentsError ? <p className="mt-1">Documents query: {documentsError.message}</p> : null}
          {selectedError ? <p className="mt-1">Assigned documents query: {selectedError.message}</p> : null}
        </section>
      ) : null}

      <form action={action} className="space-y-4 rounded-2xl border border-border bg-card p-5">
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
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents found. Upload documents first from the documents library.</p>
          ) : (
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
          )}
        </div>

        <SubmitButton className="btn-primary" idleLabel="Save changes" pendingLabel="Saving changes..." />
      </form>
    </div>
  );
}
