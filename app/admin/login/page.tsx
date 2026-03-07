"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
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
          <p className="text-sm text-muted-foreground">Use your Supabase-authenticated admin credentials.</p>
        </div>

        <div className="space-y-2">
          <label className="label">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
        </div>

        <div className="space-y-2">
          <label className="label">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
        </div>

        {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p> : null}

        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
