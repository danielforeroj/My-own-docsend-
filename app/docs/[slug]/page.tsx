import { notFound } from "next/navigation";
import { getPublicDocumentBySlug } from "@/lib/content-provider";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicDocumentPage({ params }: { params: { slug: string } }) {
  const doc = await getPublicDocumentBySlug(params.slug);
  if (!doc) notFound();

  const landing = ((doc as { landing_page?: Record<string, string | null> }).landing_page ?? {}) as Record<string, string | null>;

  let signedUrl: string | null = null;
  if (!isDemoMode() && isSupabaseConfigured() && "storage_path" in (doc as object)) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage.from("documents").createSignedUrl((doc as { storage_path: string }).storage_path, 60 * 60);
    signedUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
      <div className="card p-6">
        <h1 className="text-3xl font-semibold">{landing.page_title || (doc as { title: string }).title}</h1>
        {landing.short_description ? <p className="mt-2 text-muted-foreground">{landing.short_description}</p> : null}
      </div>
      {signedUrl ? (
        <iframe title={(doc as { title: string }).title} src={signedUrl} className="h-[70vh] w-full rounded-xl border border-border" />
      ) : (
        <div className="card p-6 text-sm text-muted-foreground">Demo mode preview: connect Supabase to stream the private PDF preview.</div>
      )}
    </main>
  );
}
