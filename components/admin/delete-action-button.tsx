"use client";

import { useFormStatus } from "react-dom";

export function DeleteActionButton({ confirmMessage = "Are you sure?" }: { confirmMessage?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="btn-inline btn-inline-compact"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      aria-label="Delete"
      title="Delete"
    >
      {pending ? "Deleting..." : (
        <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </span>
      )}
    </button>
  );
}

