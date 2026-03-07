"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h2 className="text-2xl font-semibold">Something went wrong in Admin</h2>
      <p className="text-sm text-muted-foreground">{error.message || "Please try again."}</p>
      <button className="btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
