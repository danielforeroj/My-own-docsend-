import Link from "next/link";
import { getPublicCatalogData } from "@/lib/data/repository";

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card rounded-2xl border border-dashed p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default async function HomePage() {
  const { source, documents, spaces, featuredDocuments, featuredSpaces } = await getPublicCatalogData();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-6">
      <section className="mb-8 rounded-3xl border border-border bg-card p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Multiplied Docs</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Public Document Catalog</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Browse published spaces and documents. Only items explicitly marked public and allowed in catalog appear here.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          Explore public spaces and documents below. This catalog only surfaces items explicitly marked for public access.
        </div>
        {source === "demo" ? <p className="mt-4 text-xs text-yellow-300">Demo mode: catalog uses mock public content.</p> : null}
      </section>

      {(featuredSpaces.length > 0 || featuredDocuments.length > 0) && (
        <section className="mb-10 space-y-4">
          <h2 className="text-xl font-semibold">Featured</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredSpaces.map((space) => (
              <Link key={space.id} href={`/sp/${(space as { public_slug: string }).public_slug}`} className="card rounded-2xl p-5 transition hover:border-primary/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Featured space</p>
                <h3 className="mt-1 text-lg font-semibold">{(space as { name: string }).name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{(space as { description: string | null }).description ?? "Curated public space."}</p>
              </Link>
            ))}
            {featuredDocuments.map((doc) => (
              <Link key={doc.id} href={`/d/${(doc as { public_slug: string }).public_slug}`} className="card rounded-2xl p-5 transition hover:border-primary/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Featured document</p>
                <h3 className="mt-1 text-lg font-semibold">{(doc as { title: string }).title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Public document page with a personalized URL.</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Public Spaces</h2>
          <span className="text-xs text-muted-foreground">{spaces.length} item(s)</span>
        </div>

        {spaces.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <Link key={space.id} href={`/sp/${(space as { public_slug: string }).public_slug}`} className="card rounded-2xl p-5 transition hover:border-primary/60">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Space</p>
                <h3 className="mt-1 text-lg font-semibold">{(space as { name: string }).name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{(space as { description: string | null }).description ?? "No description available."}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No public spaces yet" description="When a space is marked Public and Show in catalog, it will appear here." />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Public Documents</h2>
          <span className="text-xs text-muted-foreground">{documents.length} item(s)</span>
        </div>

        {documents.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Link key={doc.id} href={`/d/${(doc as { public_slug: string }).public_slug}`} className="card rounded-2xl p-5 transition hover:border-primary/60">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Document</p>
                <h3 className="mt-1 text-lg font-semibold">{(doc as { title: string }).title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Published document page.</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No public documents yet" description="When a document is marked Public and Show in catalog, it will appear here." />
        )}
      </section>
    </main>
  );
}
