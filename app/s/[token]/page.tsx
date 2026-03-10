/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "crypto";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { submitIntake } from "@/app/s/[token]/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkByToken, getValidAccessGrant, ShareField } from "@/lib/share";
import { getPublicShareByToken, shouldUseDemoData } from "@/lib/data/repository";
import { PublicShell, type LandingConfig } from "@/components/public/public-shell";
import { DocumentViewer } from "@/components/public/document-viewer";
import type { Database } from "@/lib/db/types";

async function getFields(shareLinkId: string): Promise<ShareField[]> {
  const supabase = createAdminClient() as any;
  const { data: fieldRows } = await supabase
    .from("share_link_fields")
    .select("id, field_name, label, field_type, is_required, options, placeholder, position, help_text, default_value, width, validation_rule")
    .eq("share_link_id", shareLinkId)
    .order("position");

  type ShareLinkFieldRow = Database["public"]["Tables"]["share_link_fields"]["Row"];
  const data = (fieldRows ?? []) as ShareLinkFieldRow[];

  return data.map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? (row.options as string[]) : null
  })) as ShareField[];
}

function withRequiredIntakeFallback(fields: ShareField[]): ShareField[] {
  if (fields.length > 0) return fields;

  return [
    {
      id: "fallback-email",
      field_name: "email",
      label: "Work email",
      field_type: "email",
      is_required: true,
      options: null,
      placeholder: "name@company.com",
      help_text: "Required to access protected content.",
      default_value: null,
      width: "full",
      validation_rule: "preset:email",
      position: 0
    }
  ] as ShareField[];
}

function FieldRenderer({ field }: { field: ShareField & { help_text?: string | null; default_value?: string | null; width?: "full" | "half" } }) {
  const commonProps = {
    name: field.field_name,
    required: field.is_required,
    className: "w-full",
    placeholder: field.placeholder ?? undefined,
    defaultValue: field.default_value ?? undefined
  };

  if (field.field_type === "textarea") return <textarea {...commonProps} rows={4} />;

  if (field.field_type === "select") {
    return (
      <select name={field.field_name} required={field.is_required} className="w-full" defaultValue={field.default_value ?? ""}>
        <option value="" disabled>
          Select option
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name={field.field_name} required={field.is_required} defaultChecked={field.default_value === "true"} />
        <span>{field.label}</span>
      </label>
    );
  }

  const type = field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text";
  return <input type={type} {...commonProps} />;
}

async function trackView({ linkId, documentId, spaceId, visitorSubmissionId }: { linkId: string; documentId: string | null; spaceId: string | null; visitorSubmissionId: string | null }) {
  const supabase = createAdminClient() as any;
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = headerStore.get("user-agent") || "unknown";
  const country = headerStore.get("x-vercel-ip-country") || headerStore.get("cf-ipcountry") || "unknown";
  const region = headerStore.get("x-vercel-ip-country-region") || headerStore.get("x-vercel-region") || "unknown";
  const city = headerStore.get("x-vercel-ip-city") || "unknown";
  const device = /mobile/i.test(userAgent) ? "mobile" : /tablet|ipad/i.test(userAgent) ? "tablet" : "desktop";
  const fingerprintHash = createHash("sha256").update(`${linkId}:${forwardedFor}:${userAgent}`).digest("hex");
  const fingerprint = `${fingerprintHash}|${country}|${region}|${city}|${device}`;

  const query = supabase
    .from("view_sessions")
    .select("id")
    .like("viewer_fingerprint", `${fingerprintHash}|%`)
    .gte("created_at", new Date(Date.now() - 1000 * 60 * 30).toISOString())
    .limit(1);

  const scopedQuery = documentId ? query.eq("document_id", documentId) : query.eq("space_id", spaceId!);
  const { data: existing } = await scopedQuery;
  if (existing?.length) return;

  await supabase.from("view_sessions").insert({
    space_id: spaceId,
    document_id: documentId,
    visitor_submission_id: visitorSubmissionId,
    viewer_fingerprint: fingerprint,
    started_at: new Date().toISOString(),
    ended_at: null
  });
}

export default async function PublicSharePage({ params, searchParams }: { params: { token: string }; searchParams?: { submitted?: string } }) {
  if (shouldUseDemoData()) {
    const demo = getPublicShareByToken(params.token);
    if (!demo) notFound();

    if (demo.link.linkType === "document" && demo.document) {
      const demoLanding = (demo.document.landingPage ?? {}) as LandingConfig & { viewer_mode?: "deck" | "document"; viewer_page_count?: number };
      const demoModeRaw = demoLanding.viewer_mode ?? (demoLanding as { viewerMode?: "deck" | "document" }).viewerMode;
      const demoPagesRaw = demoLanding.viewer_page_count ?? (demoLanding as { viewerPageCount?: number }).viewerPageCount;
      const demoMode = demoModeRaw === "deck" ? "deck" : "document";
      const demoPages = typeof demoPagesRaw === "number" && demoPagesRaw > 0 ? demoPagesRaw : 12;

      return (
        <PublicShell landing={demoLanding} title={demo.document.title}>
          <p className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
            Demo mode: backend file preview and downloads are disabled.
          </p>
          <DocumentViewer title={demo.document.title} signedUrl={null} mode={demoMode} pageCount={demoPages} analytics={{ documentId: demo.document.id, shareToken: params.token }} />
        </PublicShell>
      );
    }

    if (demo.link.linkType === "space" && demo.space) {
      return (
        <PublicShell landing={(demo.space.landingPage ?? {}) as LandingConfig} title={demo.space.name} description={demo.space.description}>
          <p className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
            Demo mode: intake submission and secure downloads are disabled.
          </p>
          <section className="space-y-3 rounded-xl border border-border bg-background p-4">
            <h2 className="text-lg font-semibold">Documents in this Space</h2>
            {demo.documents.map((doc) => (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2" key={doc.id}>
                <span className="font-medium">{doc.title}</span>
                <span className="btn-secondary opacity-70">Open (Demo mode)</span>
              </div>
            ))}
          </section>
        </PublicShell>
      );
    }

    notFound();
  }
  const linkData = await getShareLinkByToken(params.token);
  type ShareLinkRow = Database["public"]["Tables"]["share_links"]["Row"];
  const link = linkData as ShareLinkRow | null;
  if (!link) notFound();

  const [accessGrant, fieldsData] = await Promise.all([getValidAccessGrant(link.id), getFields(link.id)]);
  const fields = link.requires_intake ? withRequiredIntakeFallback(fieldsData) : fieldsData;
  const intakeSettings = (link.intake_settings ?? {}) as Record<string, string | null>;

  const supabase = createAdminClient() as any;

  if (link.requires_intake && !accessGrant) {
    const action = submitIntake.bind(null, params.token);

    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Secure content access</p>
          <h1 className="mt-1 text-3xl font-semibold">{intakeSettings.headline || "Request access"}</h1>
          <p className="mt-2 text-muted-foreground">{intakeSettings.description || "Please share a few details so we can grant access to this page."}</p>

          <form action={action} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div className={field.width === "half" ? "md:col-span-1" : "md:col-span-2"} key={field.id}>
                  {field.field_type !== "checkbox" ? (
                    <label className="mb-1 block text-sm font-medium">
                      {field.label}
                      {field.is_required ? " *" : ""}
                    </label>
                  ) : null}
                  <FieldRenderer field={field} />
                  {field.help_text ? <p className="mt-1 text-xs text-muted-foreground">{field.help_text}</p> : null}
                </div>
              ))}
            </div>

            {!fieldsData.length ? <p className="text-sm text-muted-foreground">This protected link had no custom intake fields, so we require your email to continue.</p> : null}
            {intakeSettings.consent_text ? <p className="text-xs text-muted-foreground">{intakeSettings.consent_text}</p> : null}
            <button type="submit" className="btn-primary w-full md:w-auto">
              Continue
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (link.link_type === "document" && link.document_id) {
    const { data: documentData } = await supabase
      .from("documents")
      .select("id, title, storage_path, landing_page")
      .eq("id", link.document_id)
      .eq("organization_id", link.organization_id)
      .maybeSingle();

    const document = documentData as Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "title" | "storage_path" | "landing_page"> | null;

    if (!document) notFound();

    const landing = ((document.landing_page ?? {}) as LandingConfig & { viewer_mode?: "deck" | "document"; viewer_page_count?: number }) || {};
    const viewerModeRaw = landing.viewer_mode ?? (landing as { viewerMode?: "deck" | "document" }).viewerMode;
    const viewerPagesRaw = landing.viewer_page_count ?? (landing as { viewerPageCount?: number }).viewerPageCount;
    const viewerMode = viewerModeRaw === "deck" ? "deck" : "document";
    const viewerPageCount = typeof viewerPagesRaw === "number" && viewerPagesRaw > 0 ? viewerPagesRaw : 12;

    const { data: signedUrl } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 60);

    await trackView({
      linkId: link.id,
      documentId: document.id,
      spaceId: null,
      visitorSubmissionId: accessGrant?.visitor_submission_id ?? null
    });

    return (
      <PublicShell landing={landing} title={document.title}>
        {searchParams?.submitted === "1" && intakeSettings.success_message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{intakeSettings.success_message}</div>
        ) : null}

        <DocumentViewer
          title={document.title}
          signedUrl={signedUrl?.signedUrl ?? null}
          mode={viewerMode}
          pageCount={viewerPageCount}
          downloadHref={`/s/${params.token}/download/${document.id}`}
          analytics={{ documentId: document.id, shareToken: params.token }}
        />
      </PublicShell>
    );
  }

  if (link.link_type === "space" && link.space_id) {
    const [{ data: spaceData }, { data: docsData }] = await Promise.all([
      supabase.from("spaces").select("id, name, description, landing_page").eq("id", link.space_id).eq("organization_id", link.organization_id).maybeSingle(),
      supabase.from("space_documents").select("position, documents (id, title)").eq("space_id", link.space_id).order("position")
    ]);

    const space = spaceData as Pick<Database["public"]["Tables"]["spaces"]["Row"], "id" | "name" | "description" | "landing_page"> | null;
    if (!space) notFound();

    const docs = (docsData ?? []) as Array<{ documents: { id: string; title: string } | null }>;
    const docRows = docs.map((row) => row.documents);

    await trackView({
      linkId: link.id,
      documentId: null,
      spaceId: space.id,
      visitorSubmissionId: accessGrant?.visitor_submission_id ?? null
    });

    return (
      <PublicShell landing={(space.landing_page ?? {}) as LandingConfig} title={space.name} description={space.description}>
        {searchParams?.submitted === "1" && intakeSettings.success_message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{intakeSettings.success_message}</div>
        ) : null}
        <section className="space-y-3 rounded-xl border border-border bg-background p-4">
          <h2 className="text-lg font-semibold">Documents in this Space</h2>
          {docRows.filter(Boolean).map((doc) => (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2" key={doc!.id}>
              <span className="font-medium">{doc!.title}</span>
              <Link className="btn-secondary" href={`/s/${params.token}/download/${doc!.id}`}>
                Open
              </Link>
            </div>
          ))}
          {!docRows.some(Boolean) ? <p className="text-sm text-muted-foreground">No documents in this space.</p> : null}
        </section>
      </PublicShell>
    );
  }

  notFound();
}
