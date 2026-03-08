import { AdminNav } from "@/components/admin/nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAdminContext } from "@/lib/auth/server";
import { isDemoMode } from "@/lib/runtime";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdminContext();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="card h-fit p-4 lg:sticky lg:top-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Multiplied Docs</p>
            <p className="text-sm text-muted-foreground">{ctx.role.replace("_", " ")}</p>
            {isDemoMode() ? <p className="mt-1 text-xs font-semibold text-amber-600">Demo mode</p> : null}
          </div>
          <AdminNav />
          <div className="mt-6 border-t border-border pt-4">
            <SignOutButton />
          </div>
        </aside>
        <main className="card p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
