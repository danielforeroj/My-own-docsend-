import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicDocumentBySlug } from "@/lib/data/repository";

export default async function PublicDocumentPage({ params }: { params: { slug: string } }) {
  const doc = await getPublicDocumentBySlug(params.slug);
  if (!doc) notFound();

  const landing = ((doc as { landing_page?: Record<string, unknown> }).landing_page ?? {}) as { page_title?: string; short_description?: string };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <section className="card space-y-4 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Public document</p>
        <h1 className="text-3xl font-semibold tracking-tight">{landing.page_title ?? (doc as { title: string }).title}</h1>
        {landing.short_description ? <p className="text-muted-foreground">{landing.short_description}</p> : null}
        <p className="text-sm text-muted-foreground">This document is publicly visible by slug route.</p>
        <Link href="/" className="btn-secondary inline-flex">Back home</Link>
      </section>
    </main>
  );
}
