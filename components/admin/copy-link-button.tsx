"use client";

import { useState } from "react";

export function CopyLinkButton({ path, className = "btn-inline btn-inline-compact", label = "Copy link" }: { path: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      const absolute = `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={className} onClick={onCopy} title={copied ? "Copied" : label}>
      {copied ? "Copied" : label}
    </button>
  );
}

