import Link from "next/link";
import { createSpaceActionState } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import { SlugField } from "@/components/admin/slug-field";
import { FormFieldError, ServerActionForm } from "@/components/ui/server-action-form";

export default async function NewSpacePage() {
  const ctx = await requireAdminContext();
  const supabase = createAdminClientOrNull();

  let documents: Array<Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title">> = [];
  let documentsError: string | null = null;

  if (!supabase) {
    documentsError = "Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.";
  } else {
    const { data: documentRows, error } = await supabase
      .from("documents")
      .select("id, title")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      documentsError = `${error.message}${error.code ? ` (code: ${error.code})` : ""}`;
    }

    documents = (documentRows ?? []) as Array<Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title">>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/spaces" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to spaces
      </Link>
      <h1 className="text-2xl font-semibold">Create Space</h1>

      <ServerActionForm action={createSpaceActionState} className="space-y-4 rounded-2xl border border-border bg-card p-5" idleLabel="Create space" pendingLabel="Creating space...">
        {(state) => (
          <>
            <SlugField sourceName="name" sourceLabel="Name" slugName="public_slug" slugLabel="Public URL slug" routePrefix="/sp" namespace="space" />
            <FormFieldError state={state} name="name" />
            <FormFieldError state={state} name="public_slug" />

            <div className="space-y-2">
              <label className="block text-sm font-medium">Description</label>
              <textarea name="description" className="w-full" rows={4} />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Documents in this space</label>
              <div className="space-y-2">
                {documents.map((document) => (
                  <label key={document.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="document_ids" value={document.id} /> {document.title}
                  </label>
                ))}
                {documentsError ? <p className="text-sm text-red-300">Could not load documents: {documentsError}</p> : null}
                {!documents.length && !documentsError ? <p className="text-sm text-muted-foreground">No documents uploaded yet.</p> : null}
              </div>
            </div>
            <FormFieldError state={state} name="document_ids" />
          </>
        )}
      </ServerActionForm>
    </div>
  );
}
