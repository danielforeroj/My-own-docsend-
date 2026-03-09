import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const organizationId = process.env.TEST_ORGANIZATION_ID;

if (!email || !password || !supabaseUrl || !serviceKey || !organizationId) {
  console.log("Skipping slug browser e2e: missing ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or TEST_ORGANIZATION_ID.");
  process.exit(0);
}

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.log("Skipping slug browser e2e: playwright is not installed.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);
const suffix = Date.now().toString(36);
const docDupSlug = `doc-dup-${suffix}`;
const spaceDupSlug = `space-dup-${suffix}`;

async function seed() {
  const { data: membership } = await supabase.from("memberships").select("user_id").eq("organization_id", organizationId).limit(1).maybeSingle();
  if (!membership?.user_id) throw new Error("No membership found for TEST_ORGANIZATION_ID");
  const userId = membership.user_id;

  const { data: docA } = await supabase.from("documents").insert({
    organization_id: organizationId,
    uploaded_by: userId,
    title: `Doc A ${suffix}`,
    storage_path: `${organizationId}/doc-a-${suffix}.pdf`,
    mime_type: "application/pdf",
    public_slug: docDupSlug
  }).select("id").single();

  const { data: docB } = await supabase.from("documents").insert({
    organization_id: organizationId,
    uploaded_by: userId,
    title: `Doc B ${suffix}`,
    storage_path: `${organizationId}/doc-b-${suffix}.pdf`,
    mime_type: "application/pdf",
    public_slug: `doc-unique-${suffix}`
  }).select("id").single();

  const { data: spaceA } = await supabase.from("spaces").insert({
    organization_id: organizationId,
    created_by: userId,
    name: `Space A ${suffix}`,
    slug: `space-a-internal-${suffix}`,
    public_slug: spaceDupSlug
  }).select("id").single();

  const { data: spaceB } = await supabase.from("spaces").insert({
    organization_id: organizationId,
    created_by: userId,
    name: `Space B ${suffix}`,
    slug: `space-b-internal-${suffix}`,
    public_slug: `space-unique-${suffix}`
  }).select("id").single();

  return { docA: docA.id, docB: docB.id, spaceA: spaceA.id, spaceB: spaceB.id };
}

async function runBrowser(ids) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in to admin")');
  await page.waitForURL(/\/admin/);

  await page.goto(`${baseUrl}/admin/spaces/new`, { waitUntil: "networkidle" });
  await page.fill('input[name="name"]', `New Space ${suffix}`);
  await page.fill('input[name="public_slug"]', spaceDupSlug);
  await page.locator('input[name="public_slug"]').blur();
  await page.waitForSelector('text=already in use', { timeout: 8000 });

  await page.goto(`${baseUrl}/admin/spaces/${ids.spaceB}/edit`, { waitUntil: "networkidle" });
  await page.fill('input[name="public_slug"]', spaceDupSlug);
  await page.locator('input[name="public_slug"]').blur();
  await page.waitForSelector('text=already in use', { timeout: 8000 });

  await page.goto(`${baseUrl}/admin/spaces/${ids.spaceB}`, { waitUntil: "networkidle" });
  await page.fill('input[name="public_slug"]', spaceDupSlug);
  await page.click('button:has-text("Save visibility")');
  await page.waitForSelector('text=slug is already taken', { timeout: 8000 });

  await page.goto(`${baseUrl}/admin/documents/${ids.docB}`, { waitUntil: "networkidle" });
  await page.selectOption('select[name="visibility"]', 'public');
  await page.fill('input[name="public_slug"]', docDupSlug);
  await page.click('button:has-text("Save visibility")');
  await page.waitForSelector('text=slug is already taken', { timeout: 8000 });

  await browser.close();
}

async function cleanup() {
  await supabase.from("space_documents").delete().in("space_id", []);
  await supabase.from("documents").delete().eq("organization_id", organizationId).or(`public_slug.like.doc-dup-${suffix},public_slug.like.doc-unique-${suffix}`);
  await supabase.from("spaces").delete().eq("organization_id", organizationId).or(`public_slug.like.space-dup-${suffix},public_slug.like.space-unique-${suffix}`);
}

const ids = await seed();
try {
  await runBrowser(ids);
  console.log("slug forms browser e2e passed");
} finally {
  await cleanup();
}
