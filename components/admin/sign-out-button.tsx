"use client";

import { useTransition } from "react";
import { createClientOrNull } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSignOut = () => {
    startTransition(async () => {
      const supabase = createClientOrNull();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push("/admin/login");
      router.refresh();
    });
  };

  return (
    <button className="btn-secondary w-full" onClick={onSignOut} disabled={pending}>
      {pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Signing out...</> : "Sign out"}
    </button>
  );
}
