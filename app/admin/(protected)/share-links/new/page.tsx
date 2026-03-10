import Link from "next/link";
import { redirect } from "next/navigation";
import { createShareLink } from "@/app/admin/actions";
import { IntakeFieldsEditor } from "@/components/admin/intake-fields-editor";
import { SubmitButton } from "@/components/ui/submit-button";
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

  if (!targetType || !targetId) redirect("/admin/share-links");

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
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/share-links" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to share links
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">New share link</p>
        <h1 className="mt-1 text-3xl font-semibold">Create {targetType} share link</h1>
        <p className="text-muted-foreground">Target: {targetLabel}</p>
      </div>

      <form action={createShareLink} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Link settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Internal name</label>
              <input className="w-full" name="name" placeholder="Q1 investor room" />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="requires_intake" defaultChecked /> Require intake before access
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Intake experience text</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Headline</label>
              <input name="intake_headline" className="w-full" placeholder="Access this document" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea name="intake_description" rows={3} className="w-full" placeholder="Please share a few details first." />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Consent checkbox text</label>
              <input name="intake_consent_text" className="w-full" placeholder="I agree to be contacted about this material." />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Success message text</label>
              <input name="intake_success_message" className="w-full" placeholder="Thanks — taking you to the content." />
            </div>
          </div>
        </section>

        <IntakeFieldsEditor />

        <div className="flex justify-end">
          <SubmitButton className="btn-primary" idleLabel="Create share link" pendingLabel="Creating share link..." />
        </div>
      </form>
    </div>
  );
}
