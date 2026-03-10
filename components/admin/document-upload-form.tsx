"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { normalizeSlug } from "@/lib/slug";

type UploadState = {
  error: string | null;
  success: string | null;
  loading: boolean;
};

async function derivePdfPageCount(file: File): Promise<number | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder("latin1").decode(bytes);
    const matches = text.match(/\/Type\s*\/Page\b/g) ?? [];
    if (matches.length > 0) {
      return Math.min(300, Math.max(1, matches.length));
    }
    return null;
  } catch {
    return null;
  }
}

export function DocumentUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [host, setHost] = useState("your-domain.com");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [viewerMode, setViewerMode] = useState<"deck" | "document">("document");
  const [derivedPageCount, setDerivedPageCount] = useState<number | null>(null);
  const [pageCountStatus, setPageCountStatus] = useState<"idle" | "deriving" | "ready" | "fallback">("idle");
  const [state, setState] = useState<UploadState>({ error: null, success: null, loading: false });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.host || "your-domain.com");
    }
  }, []);

  async function checkSlug(nextSlug: string) {
    const normalized = normalizeSlug(nextSlug);
    if (!normalized) {
      setSlugError("Slug is required.");
      return false;
    }

    const response = await fetch(`/api/admin/slugs/check?namespace=document&slug=${encodeURIComponent(normalized)}`);
    const payload = (await response.json()) as { available?: boolean; message?: string; normalizedSlug?: string };
    if (payload.normalizedSlug && payload.normalizedSlug !== publicSlug) setPublicSlug(payload.normalizedSlug);
    if (!payload.available) {
      setSlugError(payload.message ?? "That slug is unavailable.");
      return false;
    }
    setSlugError(null);
    return true;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ error: null, success: null, loading: true });

    if (!title.trim()) {
      setState({ error: "Document title is required.", success: null, loading: false });
      return;
    }

    if (!file || file.type !== "application/pdf") {
      setState({ error: "Please select a PDF file.", success: null, loading: false });
      return;
    }

    const slugOk = await checkSlug(publicSlug);
    if (!slugOk) {
      setState({ error: null, success: null, loading: false });
      return;
    }

    const safeViewerPageCount = derivedPageCount ?? 12;

    try {
      const uploadUrlResponse = await fetch("/api/admin/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type })
      });

      if (!uploadUrlResponse.ok) {
        const errorPayload = (await uploadUrlResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || "Could not prepare upload.");
      }

      const uploadData = (await uploadUrlResponse.json()) as { path: string; token: string };

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("documents").uploadToSignedUrl(uploadData.path, uploadData.token, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw new Error(uploadError.message);

      const finalizeResponse = await fetch("/api/admin/documents/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          publicSlug: publicSlug.trim(),
          viewerMode,
          viewerPageCount: safeViewerPageCount,
          storagePath: uploadData.path,
          fallbackFileSize: file.size,
          fallbackMimeType: file.type
        })
      });

      if (!finalizeResponse.ok) {
        const errorPayload = (await finalizeResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || "Could not finalize document.");
      }

      setTitle("");
      setPublicSlug("");
      setManualSlug(false);
      setFile(null);
      setDerivedPageCount(null);
      setPageCountStatus("idle");
      setState({ error: null, success: "Upload complete.", loading: false });
      router.push("/admin/documents");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setState({ error: message, success: null, loading: false });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!manualSlug) setPublicSlug(normalizeSlug(next));
          }}
          required
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">Public URL slug</label>
          <span className="text-xs text-muted-foreground">{manualSlug ? "Manual" : "Auto-generated"}</span>
        </div>
        <input
          value={publicSlug}
          onChange={(event) => {
            setManualSlug(true);
            setPublicSlug(normalizeSlug(event.target.value));
            setSlugError(null);
          }}
          onBlur={() => {
            void checkSlug(publicSlug);
          }}
          required
          pattern="[a-z0-9-]+"
          title="Use lowercase letters, numbers, and hyphens"
          className="w-full"
          placeholder="my-custom-doc"
        />
        <p className="text-xs text-muted-foreground">Preview: https://{host}/d/{publicSlug || "my-custom-doc"}</p>
        {slugError ? <p className="text-xs text-red-600 dark:text-red-300">{slugError}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Viewer mode</label>
        <select className="w-full" value={viewerMode} onChange={(event) => setViewerMode(event.target.value as "deck" | "document") }>
          <option value="document">Document (continuous scroll)</option>
          <option value="deck">Deck (page-by-page)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {viewerMode === "deck"
            ? `Deck navigation will use ${derivedPageCount ?? 12} pages (${pageCountStatus === "ready" ? "auto-detected" : "fallback"}).`
            : "Document mode uses continuous scrolling."}
        </p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">PDF file</label>
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="w-full"
          onChange={async (event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setFile(nextFile);
            setDerivedPageCount(null);
            if (!nextFile) {
              setPageCountStatus("idle");
              return;
            }

            setPageCountStatus("deriving");
            const count = await derivePdfPageCount(nextFile);
            if (count && Number.isFinite(count)) {
              setDerivedPageCount(count);
              setPageCountStatus("ready");
            } else {
              setDerivedPageCount(12);
              setPageCountStatus("fallback");
            }
          }}
        />
        {pageCountStatus === "deriving" ? <p className="text-xs text-muted-foreground">Analyzing PDF pages…</p> : null}
      </div>

      {state.error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p> : null}

      <button className="btn-primary" type="submit" disabled={state.loading}>
        {state.loading ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Uploading…</> : "Upload"}
      </button>
    </form>
  );
}
