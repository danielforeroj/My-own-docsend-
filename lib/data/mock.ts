export type MockDocument = {
  id: string;
  title: string;
  fileSize: number;
  createdAt: string;
  storagePath: string;
  visibility: "public" | "private";
  publicSlug: string | null;
  showInCatalog: boolean;
  isFeatured: boolean;
  landingPage?: Record<string, unknown>;
};

export type MockSpace = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  description: string;
  visibility: "public" | "private";
  publicSlug: string | null;
  showInCatalog: boolean;
  isFeatured: boolean;
  documentIds: string[];
  landingPage?: Record<string, unknown>;
};

export type MockShareLink = {
  id: string;
  token: string;
  name: string;
  linkType: "document" | "space";
  requiresIntake: boolean;
  createdAt: string;
  documentId: string | null;
  spaceId: string | null;
};

export const mockDocuments: MockDocument[] = [
  {
    id: "doc-demo-1",
    title: "Q2 Client Proposal",
    fileSize: 2_420_000,
    createdAt: "2026-01-05T10:30:00.000Z",
    storagePath: "demo/q2-client-proposal.pdf",
    visibility: "private",
    publicSlug: null,
    showInCatalog: false,
    isFeatured: false,
    landingPage: { page_title: "Q2 Client Proposal", short_description: "Executive proposal deck for Q2 planning." }
  },
  {
    id: "doc-demo-2",
    title: "Product One-Pager",
    fileSize: 860_000,
    createdAt: "2026-01-03T14:12:00.000Z",
    storagePath: "demo/product-one-pager.pdf",
    visibility: "public",
    publicSlug: "product-one-pager",
    showInCatalog: true,
    isFeatured: true,
    landingPage: { page_title: "Product One-Pager", short_description: "Public collateral for partner handoff." }
  }
];

export const mockSpaces: MockSpace[] = [
  {
    id: "space-demo-1",
    name: "Acme Onboarding",
    slug: "acme-onboarding",
    isActive: true,
    createdAt: "2026-01-04T09:00:00.000Z",
    description: "Everything Acme needs to review onboarding docs.",
    visibility: "private",
    publicSlug: null,
    showInCatalog: false,
    isFeatured: false,
    documentIds: ["doc-demo-1", "doc-demo-2"],
    landingPage: { page_title: "Acme Onboarding Space", short_description: "Welcome to your onboarding room." }
  },
  {
    id: "space-demo-2",
    name: "Partner Kit",
    slug: "partner-kit",
    isActive: true,
    createdAt: "2025-12-29T16:45:00.000Z",
    description: "Public shareable partner collateral.",
    visibility: "public",
    publicSlug: "partner-kit",
    showInCatalog: true,
    isFeatured: true,
    documentIds: ["doc-demo-2"],
    landingPage: { page_title: "Partner Kit", short_description: "Public materials for partner introductions." }
  }
];

export const mockShareLinks: MockShareLink[] = [
  {
    id: "link-demo-1",
    token: "demo-document",
    name: "Proposal Link",
    linkType: "document",
    requiresIntake: false,
    createdAt: "2026-01-06T09:30:00.000Z",
    documentId: "doc-demo-1",
    spaceId: null
  },
  {
    id: "link-demo-2",
    token: "demo-space",
    name: "Onboarding Room",
    linkType: "space",
    requiresIntake: true,
    createdAt: "2026-01-06T09:45:00.000Z",
    documentId: null,
    spaceId: "space-demo-1"
  }
];

export const mockAnalyticsSummary = {
  totalViews: 42,
  uniqueViewers: 27,
  downloads: 11,
  submissions: 6,
  recentVisits: [
    { id: "view-1", documentId: "doc-demo-1", spaceId: null, createdAt: "2026-01-08T12:00:00.000Z" },
    { id: "view-2", documentId: null, spaceId: "space-demo-1", createdAt: "2026-01-08T11:32:00.000Z" }
  ]
};

export const mockBrandingSettings = {
  organizationName: "Demo Organization",
  members: [
    { userId: "demo-admin", role: "super_admin" },
    { userId: "demo-editor", role: "editor" }
  ],
  primaryColor: "Configured in app/globals.css",
  logoUrl: "https://placehold.co/200x60?text=Demo+Logo"
};
