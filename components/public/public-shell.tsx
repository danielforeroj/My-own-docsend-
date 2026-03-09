import Image from "next/image";
import type { ReactNode } from "react";

export type LandingConfig = {
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

export function PublicShell({ landing, title, description, children }: { landing: LandingConfig; title: string; description?: string | null; children: ReactNode }) {
  const heading = landing.page_title || title;
  const body = landing.short_description || description;
  const variant = landing.layout_variant ?? "centered_hero";
  const renderSidebar = (landing.show_sidebar ?? variant === "sidebar_layout") && landing.sidebar_info;
  const showHighlights = (landing.show_highlights ?? true) && landing.highlights?.length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {landing.hero_image_url && variant !== "minimal_header" ? <Image loader={({ src }) => src} unoptimized src={landing.hero_image_url} alt="hero" width={1600} height={420} className="h-52 w-full object-cover" /> : null}
        <div className="p-6 md:p-10">
          {landing.logo_url ? <Image loader={({ src }) => src} unoptimized src={landing.logo_url} alt="logo" width={160} height={32} className="mb-4 h-8 w-auto" /> : null}
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

          {showHighlights ? (
            <ul className="mt-5 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              {(landing.highlights ?? []).map((item) => (
                <li key={item} className="rounded-lg border border-border bg-background px-3 py-2">
                  • {item}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_260px]">
            <div className="space-y-4">{children}</div>
            {renderSidebar ? <aside className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">{landing.sidebar_info}</aside> : null}
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
