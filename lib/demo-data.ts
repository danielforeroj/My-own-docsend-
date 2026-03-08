export type DemoDoc = {
  id: string;
  title: string;
  slug: string;
  description: string;
  visibility: "public" | "private";
  show_in_catalog: boolean;
  created_at: string;
  landing_page?: Record<string, unknown>;
};

export type DemoSpace = {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: "public" | "private";
  show_in_catalog: boolean;
  created_at: string;
  landing_page?: Record<string, unknown>;
  is_active?: boolean;
  documents: Array<{ id: string; title: string }>;
};

export const demoDocuments: DemoDoc[] = [
  {
    id: "doc-public-1",
    title: "Agency Capabilities Deck",
    slug: "agency-capabilities",
    description: "Overview of services, case studies, and engagement model.",
    visibility: "public",
    show_in_catalog: true,
    created_at: new Date().toISOString(),
    landing_page: { page_title: "Agency Capabilities", short_description: "A quick tour of what we do." }
  },
  {
    id: "doc-public-2",
    title: "2026 Product One-Pager",
    slug: "product-one-pager-2026",
    description: "High-level product brief for prospective customers.",
    visibility: "public",
    show_in_catalog: true,
    created_at: new Date().toISOString()
  },
  {
    id: "doc-private-1",
    title: "Private Pricing Appendix",
    slug: "private-pricing",
    description: "Internal/pricing-sensitive material.",
    visibility: "private",
    show_in_catalog: false,
    created_at: new Date().toISOString()
  }
];

export const demoSpaces: DemoSpace[] = [
  {
    id: "space-public-1",
    name: "Investor Room",
    slug: "investor-room",
    description: "Public subset of investor-ready materials.",
    visibility: "public",
    show_in_catalog: true,
    created_at: new Date().toISOString(),
    is_active: true,
    documents: [{ id: "doc-public-1", title: "Agency Capabilities Deck" }]
  },
  {
    id: "space-private-1",
    name: "Enterprise Deal Room",
    slug: "enterprise-deal-room",
    description: "Private space for an in-flight enterprise opportunity.",
    visibility: "private",
    show_in_catalog: false,
    created_at: new Date().toISOString(),
    is_active: true,
    documents: [{ id: "doc-private-1", title: "Private Pricing Appendix" }]
  }
];

export const demoAnalytics = {
  totalViews: 128,
  uniqueViewers: 47,
  downloads: 29,
  submissions: 18
};
