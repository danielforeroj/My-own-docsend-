"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ViewerMode = "deck" | "document";

function buildPdfUrl(baseUrl: string, mode: ViewerMode, page: number) {
  const params = new URLSearchParams();
  params.set("toolbar", "0");
  params.set("navpanes", "0");
  if (mode === "deck") {
    params.set("scrollbar", "0");
    params.set("view", "FitH");
    params.set("page", String(page));
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
    if (totalPages <= 12) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, currentPage - 5);
    const end = Math.min(totalPages, start + 11);
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }, [currentPage, totalPages]);

  const goToPage = (value: number) => {
    if (!Number.isFinite(value)) return;
    setCurrentPage(Math.min(totalPages, Math.max(1, Math.round(value))));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5">
      <header className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Document viewer</p>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {mode === "deck"
              ? "Presentation mode — focus on one slide at a time. Use ← → arrows to navigate."
              : "Document mode — read in a continuous, report-style flow."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {downloadHref ? <Link className="btn-primary" href={downloadHref}>Download</Link> : null}
          {signedUrl ? <Link className="btn-secondary" href={signedUrl} target="_blank">Open in new tab</Link> : null}
        </div>
      </header>

      {mode === "deck" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Slide {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button className="btn-inline" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</button>
              <button className="btn-inline" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
              <div className="flex items-center gap-1">
                <label htmlFor="jump-page" className="text-xs text-muted-foreground">Go to</label>
                <input
                  id="jump-page"
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
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-background p-2">
            <div className="flex gap-2">
              {previewPages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`group relative h-24 w-20 overflow-hidden rounded-lg border transition ${
                    page === currentPage
                      ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]"
                      : "border-border hover:border-[color:var(--primary)]"
                  }`}
                  title={`Go to slide ${page}`}
                >
                  {signedUrl ? (
                    <iframe
                      title={`slide preview ${page}`}
                      src={buildPdfUrl(signedUrl, "deck", page)}
                      className="pointer-events-none h-[200px] w-[160px] origin-top-left scale-[0.5]"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{page}</span>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{page}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background p-2 md:p-3">
            {iframeSrc ? <iframe title={`${title} slide ${currentPage}`} src={iframeSrc} className="h-[72vh] w-full rounded-xl" /> : <p className="p-4 text-sm text-muted-foreground">Unable to load document preview.</p>}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background p-2 md:p-3">
          {iframeSrc ? <iframe title={title} src={iframeSrc} className="h-[78vh] w-full rounded-xl" /> : <p className="p-4 text-sm text-muted-foreground">Unable to load document preview.</p>}
        </div>
      )}
    </section>
  );
}
