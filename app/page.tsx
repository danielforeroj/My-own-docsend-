import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">DocSend MVP Foundation</h1>
      <p className="text-slate-600">
        Internal foundation is ready. Use the admin app to manage documents and spaces.
      </p>
      <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/admin">
        Go to admin
      </Link>
    </main>
  );
}
