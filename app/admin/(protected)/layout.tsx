import { AdminNav } from "@/components/admin/nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAdminContext } from "@/lib/auth/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdminContext();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-4 text-xs uppercase tracking-wide text-slate-500">{ctx.role.replace("_", " ")}</p>
          <AdminNav />
          <div className="mt-6 border-t border-slate-200 pt-4">
            <SignOutButton />
          </div>
        </aside>
        <main className="rounded-lg border border-slate-200 bg-white p-6">{children}</main>
      </div>
    </div>
  );
}
