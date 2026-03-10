"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

export function CopyLinkButton({
  path,
  className = "btn-inline btn-inline-compact",
  label = "Copy link",
  iconOnly = false
}: {
  path: string;
  className?: string;
  label?: string;
  iconOnly?: boolean;
}) {
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

  const text = copied ? "Copied" : label;

  return (
    <button type="button" className={className} onClick={onCopy} title={text} aria-label={text}>
      <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 items-center justify-center">
        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      </span>
      {iconOnly ? <span className="sr-only">{text}</span> : <span>{text}</span>}
    </button>
  );
}
