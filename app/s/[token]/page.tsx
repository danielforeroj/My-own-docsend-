import { createHash } from "crypto";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { submitIntake } from "@/app/s/[token]/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkByToken, getValidAccessGrant, ShareField } from "@/lib/share";

async function getFields(shareLinkId: string): Promise<ShareField[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("share_link_fields")
    .select("id, field_name, label, field_type, is_required, options, placeholder, position, help_text, default_value, width, validation_rule")
    .eq("share_link_id", shareLinkId)
    .order("position");

  return (data ?? []).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? (row.options as string[]) : null
  })) as ShareField[];
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

type LandingConfig = {
  page_title?: string | null;
  short_description?: string | null;
  eyebrow?: string | null;
  hero_image_url?: string | null;
  logo_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  sidebar_info?: string | null;
  disclaimer?: string | null;
  highlights?: string[];
  about?: string | null;
  footer_text?: string | null;
  layout_variant?: "centered_hero" | "split_hero" | "minimal_header" | "content_first" | "sidebar_layout";
  show_disclaimer?: boolean;
  show_sidebar?: boolean;
  show_about?: boolean;
  show_highlights?: boolean;
};

function PublicShell({
  landing,
  title,
  description,
  children
}: {
  landing: LandingConfig;
  title: string;
  description?: string | null;
  children: React.ReactNode;
}) {
  const heading = landing.page_title || title;
  const body = landing.short_description || description;
  const variant = landing.layout_variant ?? "centered_hero";

  const sectionClass =
    variant === "minimal_header"
      ? "overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      : "overflow-hidden rounded-3xl border border-border bg-card shadow-sm";

  const contentLayoutClass =
    variant === "split_hero"
      ? "grid gap-6 md:grid-cols-2"
      : variant === "content_first"
        ? "space-y-6"
        : "space-y-6";

  const renderSidebar = (landing.show_sidebar ?? variant === "sidebar_layout") && landing.sidebar_info;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <section className={sectionClass}>
        {landing.hero_image_url && variant !== "minimal_header" ? <Image src={landing.hero_image_url} alt="hero" width={1600} height={320} unoptimized className="h-52 w-full object-cover" /> : null}
        <div className="p-6 md:p-10">
          {landing.logo_url ? <Image src={landing.logo_url} alt="logo" width={240} height={64} unoptimized className="mb-4 h-8 w-auto" /> : null}
          {landing.eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-primary">{landing.eyebrow}</p> : null}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{heading}</h1>
          {body ? <p className="mt-3 max-w-3xl text-muted-foreground">{body}</p> : null}
          {landing.cta_label && landing.cta_url ? (
            <div className="mt-4">
              <a href={landing.cta_url} className="btn-secondary inline-flex" target="_blank" rel="noreferrer">
                {landing.cta_label}
              </a>
            </div>
          ) : null}

          {(landing.show_highlights ?? true) && landing.highlights?.length ? (
            <ul className="mt-5 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              {landing.highlights.map((item) => (
                <li key={item} className="rounded-lg border border-border bg-background px-3 py-2">
                  • {item}
                </li>
              ))}
            </ul>
          ) : null}

          <div className={`mt-8 ${contentLayoutClass}`}>
            {variant === "split_hero" ? (
              <>
                <div className="space-y-4">{children}</div>
                {renderSidebar ? <aside className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">{landing.sidebar_info}</aside> : null}
              </>
            ) : (
              <div className="grid gap-6 md:grid-cols-[1fr_260px]">
                <div className="space-y-4">{children}</div>
                {renderSidebar ? <aside className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">{landing.sidebar_info}</aside> : null}
              </div>
            )}
          </div>

          {(landing.show_about ?? false) && landing.about ? (
            <section className="mt-6 rounded-xl border border-border bg-background p-4">
              <h2 className="mb-2 text-sm font-semibold">About</h2>
              <p className="text-sm text-muted-foreground">{landing.about}</p>
            </section>
          ) : null}

          {(landing.show_disclaimer ?? false) && landing.disclaimer ? <p className="mt-4 text-xs text-muted-foreground">{landing.disclaimer}</p> : null}
          {landing.footer_text ? <p className="mt-6 text-xs text-muted-foreground">{landing.footer_text}</p> : null}
        </div>
      </section>
    </main>
  );
}

async function trackView({ linkId, documentId, spaceId, visitorSubmissionId }: { linkId: string; documentId: string | null; spaceId: string | null; visitorSubmissionId: string | null }) {
  const supabase = createAdminClient();
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = headerStore.get("user-agent") || "unknown";
  const fingerprint = createHash("sha256").update(`${linkId}:${forwardedFor}:${userAgent}`).digest("hex");

  const query = supabase
    .from("view_sessions")
    .select("id")
    .eq("viewer_fingerprint", fingerprint)
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
    started_at: new Date().toISOString()
  });
}

export default async function PublicSharePage({ params, searchParams }: { params: { token: string }; searchParams?: { submitted?: string } }) {
  const link = await getShareLinkByToken(params.token);
  if (!link) notFound();

  const [accessGrant, fields] = await Promise.all([getValidAccessGrant(link.id), getFields(link.id)]);
  const intakeSettings = (link.intake_settings ?? {}) as Record<string, string | null>;

  const supabase = createAdminClient();

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

            {!fields.length ? <p className="text-sm text-muted-foreground">No custom fields configured.</p> : null}
            {intakeSettings.consent_text ? <p className="text-xs text-muted-foreground">{intakeSettings.consent_text}</p> : null}
            <button type="submit" className="btn-primary w-full md:w-auto">
              Continue to content
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (link.link_type === "document" && link.document_id) {
    const { data: document } = await supabase
      .from("documents")
      .select("id, title, storage_path, landing_page")
      .eq("id", link.document_id)
      .eq("organization_id", link.organization_id)
      .maybeSingle();

    if (!document) notFound();

    const { data: signedUrl } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 60);

    await trackView({
      linkId: link.id,
      documentId: document.id,
      spaceId: null,
      visitorSubmissionId: accessGrant?.visitor_submission_id ?? null
    });

    return (
      <PublicShell landing={(document.landing_page ?? {}) as LandingConfig} title={document.title}>
        {searchParams?.submitted === "1" && intakeSettings.success_message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{intakeSettings.success_message}</div>
        ) : null}
        {signedUrl?.signedUrl ? <iframe title={document.title} src={signedUrl.signedUrl} className="h-[70vh] w-full rounded-xl border border-border" /> : <p className="text-sm text-muted-foreground">Unable to load document preview.</p>}
        <div className="flex flex-wrap gap-3">
          <Link className="btn-primary" href={`/s/${params.token}/download/${document.id}`}>
            Download document
          </Link>
          {signedUrl?.signedUrl ? (
            <Link className="btn-secondary" href={signedUrl.signedUrl} target="_blank">
              Open in new tab
            </Link>
          ) : null}
        </div>
      </PublicShell>
    );
  }

  if (link.link_type === "space" && link.space_id) {
    const [{ data: space }, { data: docs }] = await Promise.all([
      supabase.from("spaces").select("id, name, description, landing_page").eq("id", link.space_id).eq("organization_id", link.organization_id).maybeSingle(),
      supabase.from("space_documents").select("position, documents (id, title)").eq("space_id", link.space_id).order("position")
    ]);

    if (!space) notFound();

    const docRows = ((docs ?? []) as Array<{ documents: { id: string; title: string } | null }>).map((row) => row.documents);

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
