import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSpaceBySlug } from "@/lib/content-provider";

export default async function PublicSpacePage({ params }: { params: { slug: string } }) {
  const space = await getPublicSpaceBySlug(params.slug);
  if (!space) notFound();

  const landing = ((space as { landing_page?: Record<string, string | null> }).landing_page ?? {}) as Record<string, string | null>;
  const docs = (space as { documents?: Array<{ id: string; title: string }> }).documents ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
      <div className="card p-6">
        <h1 className="text-3xl font-semibold">{landing.page_title || (space as { name: string }).name}</h1>
        <p className="mt-2 text-muted-foreground">{landing.short_description || (space as { description?: string }).description || ""}</p>
      </div>

      <section className="card space-y-3 p-6">
        <h2 className="text-lg font-semibold">Documents in this space</h2>
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span>{doc.title}</span>
            <Link className="btn-secondary" href="#">
              Available via share link
            </Link>
          </div>
        ))}
        {!docs.length ? <p className="text-sm text-muted-foreground">No public documents in this space.</p> : null}
      </section>
    </main>
  );
}
