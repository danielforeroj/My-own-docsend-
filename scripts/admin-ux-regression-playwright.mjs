const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.log("Skipping admin UX Playwright checks: playwright is not installed.");
  process.exit(0);
}

if (!email || !password) {
  console.log("Skipping admin UX Playwright checks: set ADMIN_EMAIL and ADMIN_PASSWORD.");
  process.exit(0);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertCTA(page, options) {
  for (const text of options) {
    if (await page.getByRole("link", { name: text }).count()) return;
    if (await page.getByRole("button", { name: text }).count()) return;
    if ((await page.locator(`text=${text}`).count()) > 0) return;
  }
  throw new Error(`Expected one of CTA labels: ${options.join(", ")}`);
}

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in to admin")');
  await page.waitForURL(/\/admin/);

  await page.goto(`${baseUrl}/admin/documents`, { waitUntil: "networkidle" });
  await assertCTA(page, ["Upload new PDF", "Upload PDF (Demo mode)"]);
  const docsRows = await page.locator("table tbody tr").count();
  if (docsRows === 0) {
    await assertCTA(page, ["Upload your first PDF"]);
    assert((await page.locator("text=No documents yet").count()) > 0, "Missing documents empty state");
  }
  await page.screenshot({ path: "artifacts/admin-documents-ux-mobile.png", full_page: true });

  await page.goto(`${baseUrl}/admin/spaces`, { waitUntil: "networkidle" });
  await assertCTA(page, ["Create space", "Create space (Demo mode)"]);
  const spacesRows = await page.locator("table tbody tr").count();
  if (spacesRows === 0) {
    assert((await page.locator("text=No spaces yet").count()) > 0, "Missing spaces empty state");
    await assertCTA(page, ["Create your first space"]);
  }
  await page.screenshot({ path: "artifacts/admin-spaces-ux-mobile.png", full_page: true });

  await page.goto(`${baseUrl}/admin/share-links`, { waitUntil: "networkidle" });
  const linksRows = await page.locator("table tbody tr").count();
  if (linksRows === 0) {
    assert((await page.locator("text=No share links yet").count()) > 0, "Missing share links empty state");
  } else {
    await assertCTA(page, ["Edit settings", "Open link"]);
  }
  await page.screenshot({ path: "artifacts/admin-share-links-ux-mobile.png", full_page: true });

  console.log("admin ux regression Playwright checks passed");
} finally {
  await browser.close();
}
