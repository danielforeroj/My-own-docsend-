"use client";

import Link from "next/link";

export default function ShareError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h2 className="text-2xl font-semibold">This share page hit an error</h2>
      <p className="text-sm text-muted-foreground">{error.message || "Please refresh and try again."}</p>
      <div className="flex gap-3">
        <button className="btn-primary" onClick={reset}>
          Retry
        </button>
        <Link className="btn-secondary" href="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
