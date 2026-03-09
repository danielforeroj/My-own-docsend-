import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSpaceBySlug } from "@/lib/data/repository";

export default async function PublicSpacePage({ params }: { params: { slug: string } }) {
  const space = await getPublicSpaceBySlug(params.slug);
  if (!space) notFound();

  const landing = ((space as { landing_page?: Record<string, unknown> }).landing_page ?? {}) as { page_title?: string; short_description?: string };
  const docs = (space as { documents?: Array<{ id: string; title: string; visibility?: string }> }).documents ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <section className="card space-y-5 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Public space</p>
        <h1 className="text-3xl font-semibold tracking-tight">{landing.page_title ?? (space as { name: string }).name}</h1>
        {landing.short_description ? <p className="text-muted-foreground">{landing.short_description}</p> : null}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Included documents</h2>
          {docs.filter((doc) => (doc.visibility ?? "public") === "public").map((doc) => (
            <div key={doc.id} className="rounded-lg border border-border px-3 py-2 text-sm">{doc.title}</div>
          ))}
          {!docs.length ? <p className="text-sm text-muted-foreground">No documents available.</p> : null}
        </div>

        <Link href="/" className="btn-secondary inline-flex">Back home</Link>
      </section>
    </main>
  );
}
