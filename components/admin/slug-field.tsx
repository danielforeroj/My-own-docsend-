"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidSlugFormat, normalizeSlug } from "@/lib/slug";

type SlugFieldProps = {
  sourceName?: string;
  sourceLabel?: string;
  sourceInitial?: string;
  slugName: string;
  slugInitial?: string;
  slugLabel?: string;
  routePrefix: "/d" | "/sp";
  namespace: "document" | "space";
  excludeId?: string;
};


export function SlugField({
  sourceName,
  sourceLabel = "Name",
  sourceInitial = "",
  slugName,
  slugInitial = "",
  slugLabel = "URL slug",
  routePrefix,
  namespace,
  excludeId
}: SlugFieldProps) {
  const [source, setSource] = useState(sourceInitial);
  const [slug, setSlug] = useState(slugInitial || normalizeSlug(sourceInitial));
  const [manual, setManual] = useState(Boolean(slugInitial && slugInitial !== normalizeSlug(sourceInitial)));
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");
  const [host, setHost] = useState("your-domain.com");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.host || "your-domain.com");
    }
  }, []);

  const preview = useMemo(() => `${host}${routePrefix}/${slug || "your-custom-slug"}`, [host, routePrefix, slug]);

  async function checkAvailability(nextSlug: string) {
    const normalized = normalizeSlug(nextSlug);
    if (!normalized) {
      setSlugError("Slug is required.");
      return;
    }

    if (!isValidSlugFormat(normalized)) {
      setSlugError("Use lowercase letters, numbers, and hyphens.");
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(
        `/api/admin/slugs/check?namespace=${namespace}&slug=${encodeURIComponent(normalized)}${excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : ""}`
      );
      const payload = (await response.json()) as { available?: boolean; message?: string; normalizedSlug?: string };
      if (payload.normalizedSlug && payload.normalizedSlug !== slug) {
        setSlug(payload.normalizedSlug);
      }
      if (!payload.available) {
        setSlugError(payload.message ?? "That slug is unavailable.");
        return;
      }
      setSlugError(null);
    } catch {
      setSlugError("Could not validate slug right now.");
    } finally {
      setChecking(false);
    }
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(`https://${preview}`);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      {sourceName ? (
        <div className="space-y-1">
          <label className="block text-sm font-medium">{sourceLabel}</label>
          <input
            name={sourceName}
            className="w-full"
            required
            value={source}
            onChange={(event) => {
              const next = event.target.value;
              setSource(next);
              if (!manual) {
                const nextSlug = normalizeSlug(next);
                setSlug(nextSlug);
                setSlugError(null);
              }
            }}
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-medium">{slugLabel}</label>
          <span className="text-xs text-muted-foreground">{manual ? "Manual" : "Auto-generated"}</span>
        </div>
        <input
          name={slugName}
          className={`w-full ${slugError ? "border-red-500/70 focus-visible:ring-red-500/50" : ""}`}
          value={slug}
          onChange={(event) => {
            setManual(true);
            setSlug(normalizeSlug(event.target.value));
            setSlugError(null);
          }}
          onBlur={() => checkAvailability(slug)}
          placeholder="my-custom-slug"
          pattern="[a-z0-9-]+"
          title="Use lowercase letters, numbers, and hyphens"
          required
          aria-invalid={Boolean(slugError)}
          aria-describedby={`${slugName}-help`}
        />
        <p id={`${slugName}-help`} className="text-xs text-muted-foreground">Use lowercase letters, numbers, and hyphens only.</p>
        {checking ? <p className="text-xs text-muted-foreground">Checking availability…</p> : null}
        {slugError ? <p className="text-xs text-red-600 dark:text-red-300">{slugError}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <code className="rounded border border-border bg-card px-2 py-1">https://{preview}</code>
        <button type="button" className="btn-inline" onClick={copyPreview}>Copy URL</button>
        <button
          type="button"
          className="btn-inline"
          onClick={() => {
            setManual(false);
            setSlug(normalizeSlug(source));
            setSlugError(null);
          }}
          disabled={!sourceName}
        >
          Reset to auto
        </button>
        {copyState === "done" ? <span className="text-emerald-600 dark:text-emerald-300">Copied</span> : null}
        {copyState === "error" ? <span className="text-red-600 dark:text-red-300">Copy failed</span> : null}
      </div>
    </div>
  );
}
