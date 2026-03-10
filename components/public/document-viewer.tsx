"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "@/components/ui/icons";

type ViewerMode = "deck" | "document";

function buildPdfUrl(baseUrl: string, mode: ViewerMode, page: number) {
  const params = new URLSearchParams();
  params.set("toolbar", "0");
  params.set("navpanes", "0");
  if (mode === "deck") {
    params.set("scrollbar", "0");
    params.set("page", String(page));
    params.set("zoom", "page-fit");
  }
  return `${baseUrl}#${params.toString()}`;
}

export function DocumentViewer({
  title,
  signedUrl,
  mode,
  pageCount,
  downloadHref,
  analytics
}: {
  title: string;
  signedUrl: string | null;
  mode: ViewerMode;
  pageCount?: number;
  downloadHref?: string;
  analytics?: { documentId: string; shareToken?: string };
}) {
  const totalPages = Math.max(1, pageCount ?? 1);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState("1");

  useEffect(() => {
    setJumpInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (mode !== "deck") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setCurrentPage((page) => Math.min(totalPages, page + 1));
      if (event.key === "ArrowLeft") setCurrentPage((page) => Math.max(1, page - 1));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, totalPages]);

  useEffect(() => {
    if (!analytics) return;

    fetch("/api/viewer-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: analytics.documentId,
        shareToken: analytics.shareToken ?? null,
        page: 1,
        mode,
        event: "view_start"
      })
    }).catch(() => {
      // non-blocking analytics
    });

    return () => {
      void fetch("/api/viewer-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          documentId: analytics.documentId,
          shareToken: analytics.shareToken ?? null,
          page: 1,
          mode,
          event: "view_end"
        })
      }).catch(() => {
        // non-blocking analytics
      });
    };
  }, [analytics, mode]);

  useEffect(() => {
    if (mode !== "deck" || !analytics) return;

    fetch("/api/viewer-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: analytics.documentId,
        shareToken: analytics.shareToken ?? null,
        page: currentPage,
        mode: "deck",
        event: "slide_change"
      })
    }).catch(() => {
      // non-blocking analytics
    });
  }, [mode, currentPage, analytics]);

  const iframeSrc = useMemo(() => {
    if (!signedUrl) return null;
    return buildPdfUrl(signedUrl, mode, currentPage);
  }, [signedUrl, mode, currentPage]);

  const previewPages = useMemo(() => {
    if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, currentPage - 4);
    const end = Math.min(totalPages, start + 9);
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }, [currentPage, totalPages]);

  const goToPage = (value: number) => {
    if (!Number.isFinite(value)) return;
    setCurrentPage(Math.min(totalPages, Math.max(1, Math.round(value))));
  };

  const modeTitle = mode === "deck" ? "Deck mode" : "Document mode";
  const modeDescription =
    mode === "deck"
      ? "Slide-by-slide controls are enabled. Use arrows or jump to any slide."
      : "Continuous reading view for reports and long-form documents.";

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Secure viewer</p>
            <h2 className="mt-0.5 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{modeTitle}: {modeDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {mode === "deck" ? `Deck · ${totalPages} slides` : "Document · Continuous scroll"}
            </span>
            {downloadHref ? <Link className="btn-secondary" href={downloadHref}>Download PDF</Link> : null}
            {signedUrl ? (
              <Link className="btn-inline" href={signedUrl} target="_blank" title="Open original PDF" aria-label="Open original PDF">
                <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Open original</span>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {mode === "deck" ? (
        <div className="space-y-3 p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Slide {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button className="btn-inline" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</button>
              <button className="btn-inline" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
              <input
                aria-label="Go to slide"
                className="h-8 w-16 rounded-lg px-2 py-1 text-xs"
                type="number"
                min={1}
                max={totalPages}
                value={jumpInput}
                onChange={(event) => setJumpInput(event.target.value)}
                onBlur={() => goToPage(Number(jumpInput))}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-background p-2">
            <div className="flex gap-2">
              {previewPages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 min-w-9 rounded-md border px-2 text-xs font-semibold ${
                    page === currentPage
                      ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)] text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-[color:var(--primary)]"
                  }`}
                  title={`Go to slide ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background p-2 md:p-3">
            {iframeSrc ? (
              <iframe key={`deck-${currentPage}`} title={`${title} slide ${currentPage}`} src={iframeSrc} className="h-[74vh] w-full rounded-lg" />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Unable to load document preview.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-3 md:p-4">
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Reading mode: all pages are in one continuous stream for easier scanning and search.
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background p-2 md:p-3">
            {iframeSrc ? <iframe key="document-scroll" title={title} src={iframeSrc} className="h-[82vh] w-full rounded-lg" /> : <p className="p-4 text-sm text-muted-foreground">Unable to load document preview.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
