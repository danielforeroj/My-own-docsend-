import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";

async function fetchText(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  return { response, text };
}

async function run() {
  const demoShare = await fetchText("/s/demo-document");
  assert.equal(demoShare.response.status, 200, "Expected /s/demo-document to load");
  assert.match(demoShare.text, /Document viewer/i, "Share document page should render viewer shell");
  assert.match(demoShare.text, /Presentation mode|Document mode/i, "Share document page should render viewer mode text");

  const publicDoc = await fetchText("/docs/product-one-pager");
  assert.equal(publicDoc.response.status, 200, "Expected /docs/product-one-pager to load");
  assert.match(publicDoc.text, /Document viewer/i, "Public document page should render viewer shell");

  const adminDocs = await fetchText("/admin/documents");
  assert.equal(adminDocs.response.status, 200, "Expected /admin/documents to load in demo mode");
  assert.match(adminDocs.text, /Viewer/i, "Admin documents table should include Viewer column");

  console.log("viewer-integration smoke checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
