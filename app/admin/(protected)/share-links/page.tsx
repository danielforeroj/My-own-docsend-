import Link from "next/link";
import { deleteShareLink } from "@/app/admin/actions";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { DeleteActionButton } from "@/components/admin/delete-action-button";
import { requireAdminContext } from "@/lib/auth/server";
import { ExternalLinkIcon, PencilIcon } from "@/components/ui/icons";
import { getShareLinksData } from "@/lib/data/repository";

export default async function ShareLinksPage() {
  const ctx = await requireAdminContext();
  const { source, links } = await getShareLinksData(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Distribution</p>
        <h1 className="text-3xl font-semibold tracking-tight">Share Links</h1>
        <p className="text-muted-foreground">Manage secure links for documents and spaces, including intake settings.</p>
        {source === "demo" ? <p className="mt-2 text-xs text-yellow-300">Demo mode: link mutations are disabled.</p> : null}
      </div>

      {source === "supabase" && links.length === 0 ? (
        <section className="card p-4">
          <h2 className="font-semibold">No share links yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a share link from a document or space page. It will show up here for quick access and editing.</p>
        </section>
      ) : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Intake</th><th className="px-4 py-3">Public URL</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {links.map((link: { id: string; token: string; name: string | null; link_type: string; requires_intake: boolean }) => (
                <tr key={link.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{link.name || "Untitled link"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{link.link_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{link.requires_intake ? "Required" : "Disabled"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">/s/{link.token}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-start gap-1.5 md:justify-end md:gap-2">
                      <Link className="btn-inline btn-inline-compact" href={`/admin/share-links/${link.id}`} title="Edit link settings" aria-label="Edit link settings"><PencilIcon className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Edit settings</span></Link>
                      <Link className="btn-inline btn-inline-compact" href={`/s/${link.token}`} target="_blank" title="Open public link" aria-label="Open public link"><ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Open link</span></Link>
                      <CopyLinkButton className="btn-inline btn-inline-compact" path={`/s/${link.token}`} label="Copy share link" iconOnly />
                      <form action={deleteShareLink.bind(null, link.id)} className="inline-flex">
                        <DeleteActionButton confirmMessage="Delete this share link? Existing visitors may lose access." />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
