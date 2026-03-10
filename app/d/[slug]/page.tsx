import { notFound } from "next/navigation";
import { getPublicDocumentBySlug, shouldUseDemoData } from "@/lib/data/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicShell, type LandingConfig } from "@/components/public/public-shell";
import { DocumentViewer } from "@/components/public/document-viewer";

export default async function PublicDocumentPage({ params }: { params: { slug: string } }) {
  const doc = await getPublicDocumentBySlug(params.slug);
  if (!doc) notFound();

  const raw = doc as {
    id?: string;
    title: string;
    storage_path?: string;
    storagePath?: string;
    landing_page?: LandingConfig | null;
    landingPage?: LandingConfig | null;
  };

  const normalizedStoragePath = raw.storage_path ?? raw.storagePath;
  const landing = ((raw.landing_page ?? raw.landingPage) ?? {}) as LandingConfig & { viewer_mode?: "deck" | "document"; viewer_page_count?: number };

  const viewerModeRaw = landing.viewer_mode ?? (landing as { viewerMode?: "deck" | "document" }).viewerMode;
  const viewerPagesRaw = landing.viewer_page_count ?? (landing as { viewerPageCount?: number }).viewerPageCount;
  const viewerMode = viewerModeRaw === "deck" ? "deck" : "document";
  const viewerPageCount = typeof viewerPagesRaw === "number" && viewerPagesRaw > 0 ? viewerPagesRaw : 12;

  const { data: signedUrl } = !shouldUseDemoData() && normalizedStoragePath
    ? await createAdminClient().storage.from("documents").createSignedUrl(normalizedStoragePath, 60 * 60)
    : { data: null as { signedUrl?: string } | null };

  return (
    <PublicShell landing={landing} title={raw.title}>
      <DocumentViewer
        title={raw.title}
        signedUrl={signedUrl?.signedUrl ?? null}
        mode={viewerMode}
        pageCount={viewerPageCount}
        analytics={{ documentId: raw.id ?? params.slug }}
      />
    </PublicShell>
  );
}
