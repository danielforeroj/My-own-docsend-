import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function SpaceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, description, created_at, is_active")
    .eq("id", params.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (!space) notFound();

  const [{ count: viewsCount }, { count: submissionsCount }, { data: docs }] = await Promise.all([
    supabase.from("view_sessions").select("id", { count: "exact", head: true }).eq("space_id", space.id),
    supabase.from("visitor_submissions").select("id", { count: "exact", head: true }).eq("space_id", space.id),
    supabase
      .from("space_documents")
      .select("position, documents (id, title)")
      .eq("space_id", space.id)
      .order("position")
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/spaces" className="text-sm text-slate-600 underline">
          ← Back to spaces
        </Link>
        <h1 className="text-2xl font-semibold">{space.name}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total views</p>
          <p className="text-2xl font-semibold">{viewsCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Captured submissions</p>
          <p className="text-2xl font-semibold">{submissionsCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Status</p>
          <p className="text-sm font-medium">{space.is_active ? "Active" : "Inactive"}</p>
        </div>
      </div>

      {space.description ? (
        <section className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-2 font-semibold">Description</h2>
          <p className="text-sm text-slate-700">{space.description}</p>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="mb-2 font-semibold">Documents in this Space</h2>
        {((docs ?? []) as Array<{ documents: { id: string; title: string } | null }>).map((row, index) => (
          <div className="text-sm" key={`${row.documents?.id ?? "none"}-${index}`}>
            {row.documents ? (
              <Link className="underline" href={`/admin/documents/${row.documents.id}`}>
                {row.documents.title}
              </Link>
            ) : (
              "Unknown document"
            )}
          </div>
        ))}
        {!docs?.length ? <p className="text-sm text-slate-500">No documents assigned yet.</p> : null}
      </section>
    </div>
  );
}
