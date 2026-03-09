"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type UploadState = {
  error: string | null;
  success: string | null;
  loading: boolean;
};

export function DocumentUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ error: null, success: null, loading: false });

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
      setFile(null);
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
        <input value={title} onChange={(event) => setTitle(event.target.value)} required className="w-full" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">PDF file</label>
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="w-full"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {state.error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p> : null}

      <button className="btn-primary" type="submit" disabled={state.loading}>
        {state.loading ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
