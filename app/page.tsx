import Link from "next/link";
import { getCatalogData } from "@/lib/content-provider";
import { isDemoMode } from "@/lib/runtime";

export default async function HomePage() {
  const catalog = await getCatalogData();
  const demo = isDemoMode();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-8 px-6 py-10">
      <section className="card p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{demo ? "Demo catalog" : "Public catalog"}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Multiplied Doc Room</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Browse public spaces and documents. Private content is hidden from this catalog and only available by exact URL or share link.
        </p>
        <div className="mt-6 flex gap-3">
          <Link className="btn-primary" href="/admin">
            Open admin
          </Link>
          <Link className="btn-secondary" href="/admin/login">
            {demo ? "Enter demo admin" : "Admin login"}
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Public spaces</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {catalog.spaces.map((space) => (
            <article className="card p-5" key={space.id}>
              <h3 className="text-lg font-semibold">{space.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{space.description || "No description provided."}</p>
              {space.slug ? (
                <Link className="btn-secondary mt-4 inline-flex" href={`/spaces/${space.slug}`}>
                  Open space
                </Link>
              ) : null}
            </article>
          ))}
          {!catalog.spaces.length ? <p className="card p-6 text-sm text-muted-foreground">No public spaces yet.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Public documents</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {catalog.documents.map((doc) => (
            <article className="card p-5" key={doc.id}>
              <h3 className="text-lg font-semibold">{doc.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{doc.description || "No description provided."}</p>
              {doc.slug ? (
                <Link className="btn-secondary mt-4 inline-flex" href={`/docs/${doc.slug}`}>
                  Open document
                </Link>
              ) : null}
            </article>
          ))}
          {!catalog.documents.length ? <p className="card p-6 text-sm text-muted-foreground">No public documents yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
