import { notFound } from "next/navigation";
import { getPublicDocumentBySlug } from "@/lib/data/repository";
import { PublicShell, type LandingConfig } from "@/components/public/public-shell";

export default async function PublicDocumentPage({ params }: { params: { slug: string } }) {
  const doc = await getPublicDocumentBySlug(params.slug);
  if (!doc) notFound();

  const document = doc as { title: string; landing_page?: LandingConfig | null };
  const landing = (document.landing_page ?? {}) as LandingConfig;

  return (
    <PublicShell landing={landing} title={document.title}>
      <div className="rounded-xl border border-border bg-background p-5">
        <p className="text-sm text-muted-foreground">This public document is published for direct access by slug.</p>
      </div>
    </PublicShell>
  );
}
