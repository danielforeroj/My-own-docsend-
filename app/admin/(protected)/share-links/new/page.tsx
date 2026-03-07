import Link from "next/link";
import { redirect } from "next/navigation";
import { createShareLink } from "@/app/admin/actions";
import { IntakeFieldsEditor } from "@/components/admin/intake-fields-editor";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function NewShareLinkPage({
  searchParams
}: {
  searchParams: { targetType?: "space" | "document"; targetId?: string };
}) {
  const ctx = await requireAdminContext();
  const targetType = searchParams.targetType;
  const targetId = searchParams.targetId;

  if (!targetType || !targetId) {
    redirect("/admin/share-links");
  }

  const supabase = await createClient();

  const target =
    targetType === "space"
      ? await supabase
          .from("spaces")
          .select("id, name")
          .eq("id", targetId)
          .eq("organization_id", ctx.organizationId)
          .maybeSingle()
      : await supabase
          .from("documents")
          .select("id, title")
          .eq("id", targetId)
          .eq("organization_id", ctx.organizationId)
          .maybeSingle();

  if (!target.data) redirect("/admin/share-links");

  const targetLabel = targetType === "space" ? (target.data as { name: string }).name : (target.data as { title: string }).title;

  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/admin/share-links" className="text-sm text-slate-600">
        ← Back to share links
      </Link>
      <h1 className="text-2xl font-semibold">Create Share Link</h1>
      <p className="text-sm text-slate-600">
        Target: {targetType} — {targetLabel}
      </p>

      <form action={createShareLink} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />

        <div className="space-y-2">
          <label className="block text-sm font-medium">Internal name (optional)</label>
          <input className="w-full" name="name" placeholder="Q1 investor room - external" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requires_intake" defaultChecked /> Require intake form before access
        </label>

        <IntakeFieldsEditor />

        <button className="bg-slate-900 text-white" type="submit">
          Create share link
        </button>
      </form>
    </div>
  );
}
