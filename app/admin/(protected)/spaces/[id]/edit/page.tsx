import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSpaceActionState } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import { SlugField } from "@/components/admin/slug-field";
import { FormFieldError, ServerActionForm } from "@/components/ui/server-action-form";

export default async function EditSpacePage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = createAdminClientOrNull();

  if (!supabase) {
    throw new Error("Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.");
  }

  const [{ data: spaceData, error: spaceError }, { data: documentsData, error: documentsError }, { data: selectedData, error: selectedError }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, name, description, is_active, public_slug")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle(),
    supabase.from("documents").select("id, title").eq("organization_id", ctx.organizationId),
    supabase.from("space_documents").select("document_id, documents!inner(id, organization_id)").eq("space_id", params.id).eq("documents.organization_id", ctx.organizationId)
  ]);

  type SpaceRow = Pick<Database["public"]["Tables"]["spaces"]["Row"], "id" | "name" | "description" | "is_active" | "public_slug">;
  type DocumentRow = Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title">;
  type SpaceDocumentRow = { document_id: string };

  const space = spaceData as SpaceRow | null;
  const documents = (documentsData ?? []) as DocumentRow[];
  const selected = (selectedData ?? []) as SpaceDocumentRow[];

  if (spaceError) {
    throw new Error(`Could not load space: ${spaceError.message}${spaceError.code ? ` (code: ${spaceError.code})` : ""}`);
  }

  if (!space) notFound();

  const selectedIds = new Set(selected.map((item) => item.document_id));
  const action = updateSpaceActionState.bind(null, space.id);

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/spaces" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to spaces
      </Link>
      <h1 className="text-2xl font-semibold">Edit Space</h1>

      {documentsError || selectedError ? (
        <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold text-red-300">Some document assignment data could not be loaded.</p>
          {documentsError ? <p className="mt-1">Documents query: {documentsError.message}</p> : null}
          {selectedError ? <p className="mt-1">Assigned documents query: {selectedError.message}</p> : null}
        </section>
      ) : null}

      <ServerActionForm action={action} className="space-y-4 rounded-2xl border border-border bg-card p-5" idleLabel="Save changes" pendingLabel="Saving changes...">
        {(state) => (
          <>
            <SlugField
              sourceName="name"
              sourceLabel="Name"
              sourceInitial={space.name}
              slugName="public_slug"
              slugInitial={space.public_slug ?? ""}
              slugLabel="Public URL slug"
              routePrefix="/sp"
              namespace="space"
              excludeId={space.id}
            />
            <FormFieldError state={state} name="name" />
            <FormFieldError state={state} name="public_slug" />

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
                  {documents.map((document) => (
                    <label key={document.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="document_ids" value={document.id} defaultChecked={selectedIds.has(document.id)} />
                      {document.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <FormFieldError state={state} name="document_ids" />
          </>
        )}
      </ServerActionForm>
    </div>
  );
}
