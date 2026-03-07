import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6">
      <section className="card w-full p-8 md:p-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Internal platform</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Multiplied Doc Room</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Securely share documents and spaces, capture leads, and track engagement with a clean admin workflow.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/admin">
            Open admin
          </Link>
          <Link className="btn-secondary" href="/admin/login">
            Admin login
          </Link>
        </div>
      </section>
    </main>
  );
}
