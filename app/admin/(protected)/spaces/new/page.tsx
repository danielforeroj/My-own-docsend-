import Link from "next/link";
import { requireAdminContext } from "@/lib/auth/server";
import { createClientOrNull } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { CreateSpaceForm } from "@/components/admin/forms/admin-action-forms";

export default async function NewSpacePage() {
  const ctx = await requireAdminContext();
  const supabase = await createClientOrNull();

  let documents: Array<Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title">> = [];
  let documentsError: string | null = null;

  if (!supabase) {
    documentsError = "Could not initialize Supabase server client.";
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

      <CreateSpaceForm documents={documents} documentsError={documentsError} />
    </div>
  );
}
