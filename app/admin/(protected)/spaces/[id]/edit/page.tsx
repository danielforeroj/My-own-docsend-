import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/auth/server";
import { createClientOrNull } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { EditSpaceForm } from "@/components/admin/forms/admin-action-forms";

export default async function EditSpacePage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClientOrNull();

  if (!supabase) {
    throw new Error("Could not initialize Supabase server client.");
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

      <EditSpaceForm
        space={space}
        documents={documents}
        selectedDocumentIds={selected.map((item) => item.document_id)}
      />
    </div>
  );
}
