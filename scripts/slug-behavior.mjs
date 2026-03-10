import assert from "node:assert/strict";
import fs from "node:fs";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

function normalizeSlug(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function expectRedirect(path, expected) {
  const response = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  assert.equal(response.status, 307, `${path} should redirect`);
  assert.equal(response.headers.get("location"), expected, `${path} should redirect to ${expected}`);
}

async function run() {
  const cases = [
    ["  My New Space  ", "my-new-space"],
    ["@@Big   Launch!!!", "big-launch"],
    ["Already-valid", "already-valid"]
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeSlug(input), expected, `normalizeSlug failed for ${input}`);
  }

  const actionsSource = fs.readFileSync("app/admin/actions.ts", "utf8");
  const finalizeSource = fs.readFileSync("app/api/admin/documents/finalize/route.ts", "utf8");
  assert.match(actionsSource, /ensureUniquePublicSlug\(/, "actions should enforce slug uniqueness");
  assert.match(actionsSource, /\.eq\("public_slug", slug\)/, "actions uniqueness query should scope by public_slug");
  assert.match(finalizeSource, /\.eq\("public_slug", normalizedSlug\)/, "document finalize should enforce slug uniqueness");

  await expectRedirect("/docs/demo-slug", "/d/demo-slug");
  await expectRedirect("/spaces/team-room", "/sp/team-room");

  console.log("slug behavior checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
