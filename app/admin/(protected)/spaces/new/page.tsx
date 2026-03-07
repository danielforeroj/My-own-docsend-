import Link from "next/link";
import { createSpace } from "@/app/admin/actions";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function NewSpacePage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, title")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/spaces" className="text-sm text-slate-600">
        ← Back to spaces
      </Link>
      <h1 className="text-2xl font-semibold">Create Space</h1>

      <form action={createSpace} className="space-y-4 rounded-lg border border-slate-200 p-4">
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
            {documents?.map((document) => (
              <label key={document.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="document_ids" value={document.id} /> {document.title}
              </label>
            ))}
            {!documents?.length ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> : null}
          </div>
        </div>

        <button className="bg-slate-900 text-white" type="submit">
          Create space
        </button>
      </form>
    </div>
  );
}
