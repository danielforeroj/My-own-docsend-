import Link from "next/link";
import { createSpace } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

export default async function NewSpacePage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: documentRows } = await supabase
    .from("documents")
    .select("id, title")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  const documents = (documentRows ?? []) as Array<Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title">>;

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/spaces" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to spaces
      </Link>
      <h1 className="text-2xl font-semibold">Create Space</h1>

      <form action={createSpace} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Name</label>
          <input name="name" required className="w-full" />
        </div>
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
            {!documents.length ? <p className="text-sm text-muted-foreground">No documents uploaded yet.</p> : null}
          </div>
        </div>

        <button className="btn-primary" type="submit">
          Create space
        </button>
      </form>
    </div>
  );
}
