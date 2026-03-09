import { notFound } from "next/navigation";
import { getPublicSpaceBySlug } from "@/lib/data/repository";
import { PublicShell, type LandingConfig } from "@/components/public/public-shell";

export default async function PublicSpacePage({ params }: { params: { slug: string } }) {
  const result = await getPublicSpaceBySlug(params.slug);
  if (!result) notFound();

  const space = result as {
    name: string;
    description: string | null;
    landing_page?: LandingConfig | null;
    documents?: Array<{ id: string; title: string }>;
  };

  const landing = (space.landing_page ?? {}) as LandingConfig;
  const docs = space.documents ?? [];

  return (
    <PublicShell landing={landing} title={space.name} description={space.description}>
      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <h2 className="text-lg font-semibold">Documents in this Space</h2>
        {docs.map((doc) => (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2" key={doc.id}>
            <span className="font-medium">{doc.title}</span>
            <span className="btn-secondary opacity-80">Public item</span>
          </div>
        ))}
        {!docs.length ? <p className="text-sm text-muted-foreground">No public documents available in this space.</p> : null}
      </section>
    </PublicShell>
  );
}
