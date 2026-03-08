"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/runtime";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSignOut = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/admin/login");
      router.refresh();
    });
  };

  return (
    <button className="btn-secondary w-full" onClick={onSignOut} disabled={pending}>
      {pending ? "Signing out..." : isDemoMode() ? "Exit demo" : "Sign out"}
    </button>
  );
}
