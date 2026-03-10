"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ViewerMode = "deck" | "document";

type PdfJsRuntime = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { url: string; isEvalSupported: boolean }) => {
    promise: Promise<{
      numPages: number;
      getPage: (page: number) => Promise<{
        getViewport: (opts: { scale: number }) => { width: number; height: number };
        render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
      }>;
    }>;
  };
};


let pdfJsLoader: Promise<void> | null = null;

function ensurePdfJsRuntime() {
  if (typeof window === "undefined") return Promise.resolve();
  const existing = (window as Window & { pdfjsLib?: PdfJsRuntime }).pdfjsLib;
  if (existing) return Promise.resolve();
  if (pdfJsLoader) return pdfJsLoader;

  pdfJsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PDF renderer."));
    document.head.appendChild(script);
  });

  return pdfJsLoader;
}

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
  analytics,
  immersive = false
}: {
  title: string;
  signedUrl: string | null;
  mode: ViewerMode;
  pageCount?: number;
  analytics?: { documentId: string; shareToken?: string };
  immersive?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState("1");
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalPages = Math.max(1, pageCount ?? pdfTotalPages ?? 1);

  useEffect(() => {
    setJumpInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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

  useEffect(() => {
    if (mode !== "deck" || !signedUrl || !canvasRef.current) return;

    let disposed = false;
    const canvas = canvasRef.current;

    (async () => {
      try {
        setRendering(true);
        setDeckError(null);

        await ensurePdfJsRuntime();
        const pdfjs = (window as Window & { pdfjsLib?: PdfJsRuntime }).pdfjsLib;
        if (!pdfjs) throw new Error("PDF runtime unavailable");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        }

        const loadingTask = pdfjs.getDocument({ url: signedUrl, isEvalSupported: false });
        const pdf = await loadingTask.promise;
        if (disposed) return;

        setPdfTotalPages(pdf.numPages);
        const safePage = Math.min(Math.max(1, currentPage), pdf.numPages);
        const page = await pdf.getPage(safePage);

        const parentWidth = canvas.parentElement?.clientWidth ?? 1200;
        const initialViewport = page.getViewport({ scale: 1 });
        const scale = Math.max(0.2, Math.min(4, (parentWidth - 24) / initialViewport.width));
        const viewport = page.getViewport({ scale });

        const context = canvas.getContext("2d");
        if (!context) {
          setDeckError("Could not initialize canvas renderer.");
          return;
        }

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        await page.render({ canvasContext: context, viewport }).promise;
      } catch {
        if (!disposed) setDeckError("Unable to render this slide right now.");
      } finally {
        if (!disposed) setRendering(false);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [mode, signedUrl, currentPage]);

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

  const surfaceClass = immersive
    ? "flex min-h-screen flex-col bg-[#121212] text-neutral-100"
    : "rounded-2xl border border-border bg-card shadow-sm";
  const headerClass = immersive ? "border-b border-white/10 px-4 py-3 md:px-6" : "border-b border-border px-4 py-3 md:px-6";
  const mutedText = immersive ? "text-neutral-400" : "text-muted-foreground";

  return (
    <section className={surfaceClass}>
      <header className={headerClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Secure viewer</p>
            <h2 className="mt-0.5 text-lg font-semibold">{title}</h2>
            <p className={`mt-1 text-xs ${mutedText}`}>{modeTitle}: {modeDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${immersive ? "border-white/20 bg-white/5 text-neutral-300" : "border-border bg-background text-muted-foreground"}`}>
              {mode === "deck" ? `Deck · ${totalPages} slides` : "Document · Continuous scroll"}
            </span>
          </div>
        </div>
      </header>

      {mode === "deck" ? (
        <div className={`space-y-3 p-3 md:p-4 ${immersive ? "bg-[#1a1a1a]" : ""}`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${immersive ? "border-white/10 bg-black/30" : "border-border bg-background"}`}>
            <span className={mutedText}>Slide {currentPage} of {totalPages}</span>
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

          <div className={`overflow-x-auto rounded-xl border p-2 ${immersive ? "border-white/10 bg-black/30" : "border-border bg-background"}`}>
            <div className="flex gap-2">
              {previewPages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 min-w-9 rounded-md border px-2 text-xs font-semibold ${
                    page === currentPage
                      ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)] text-foreground"
                      : `${immersive ? "border-white/20 bg-white/5 text-neutral-300 hover:border-[color:var(--primary)]" : "border-border bg-card text-muted-foreground hover:border-[color:var(--primary)]"}`
                  }`}
                  title={`Go to slide ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex min-h-[72vh] items-center justify-center overflow-auto rounded-xl border p-3 ${immersive ? "border-white/10 bg-[#0b0b0b]" : "border-border bg-background"}`}>
            {!signedUrl ? <p className={`p-4 text-sm ${mutedText}`}>Unable to load document preview.</p> : null}
            {deckError ? <p className={`p-4 text-sm ${mutedText}`}>{deckError}</p> : null}
            {signedUrl ? <canvas ref={canvasRef} className={rendering ? "opacity-50" : "opacity-100"} /> : null}
          </div>
        </div>
      ) : (
        <div className={`space-y-3 p-3 md:p-4 ${immersive ? "bg-[#1a1a1a]" : ""}`}>
          <div className={`rounded-xl border px-3 py-2 text-sm ${immersive ? "border-white/10 bg-black/30 text-neutral-400" : "border-border bg-background text-muted-foreground"}`}>
            Reading mode: all pages are in one continuous stream for easier scanning and search.
          </div>
          <div className={`overflow-hidden rounded-xl border p-2 md:p-3 ${immersive ? "border-white/10 bg-[#0b0b0b]" : "border-border bg-background"}`}>
            {iframeSrc ? <iframe key="document-scroll" title={title} src={iframeSrc} className="h-[82vh] w-full rounded-lg" /> : <p className={`p-4 text-sm ${mutedText}`}>Unable to load document preview.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
