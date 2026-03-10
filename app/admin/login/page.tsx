"use client";

import { useState, useTransition } from "react";
import { createClientOrNull, isBrowserDemoMode, isBrowserSupabaseConfigured } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const supabaseReady = isBrowserSupabaseConfigured();
  const demoMode = isBrowserDemoMode() || !supabaseReady;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!supabaseReady) {
      setError("Supabase is not configured yet. Add Supabase environment variables to enable admin login.");
      return;
    }

    startTransition(async () => {
      const supabase = createClientOrNull();

      if (!supabase) {
        setError("Supabase is not configured yet. Add Supabase environment variables to enable admin login.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <form className="card w-full space-y-5 p-6" onSubmit={onSubmit}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Multiplied Docs</p>
          <h1 className="mt-1 text-2xl font-semibold">Admin login</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage documents, spaces, and share links.</p>
        </div>

        {!supabaseReady ? (
          <p className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
            Supabase is not configured yet. Login will be available after setting NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        ) : null}

        <div className="space-y-2">
          <label className="label">Work email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" disabled={!supabaseReady} />
          <p className="text-xs text-muted-foreground">Use the email for your admin account.</p>
        </div>

        <div className="space-y-2">
          <label className="label">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" disabled={!supabaseReady} />
        </div>

        {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p> : null}

        <div className="space-y-3 pt-1">
          <button className="btn-primary w-full" disabled={pending || !supabaseReady}>
            {pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Signing in...</> : "Sign in to admin"}
          </button>

          {demoMode ? (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => {
                router.push("/admin");
                router.refresh();
              }}
            >
              Enter admin preview (Demo mode)
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
