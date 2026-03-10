import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log("viewer-persistence-e2e skipped (missing Supabase service-role env vars)");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function fetchText(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  return { response, text };
}

async function run() {
  const { data: share } = await supabase
    .from("share_links")
    .select("token, document_id")
    .eq("link_type", "document")
    .eq("requires_intake", false)
    .not("document_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!share?.document_id || !share.token) {
    console.log("viewer-persistence-e2e skipped (no suitable document share link found)");
    return;
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, landing_page")
    .eq("id", share.document_id)
    .maybeSingle();

  assert.ok(doc?.id, "Expected a document for selected share link");

  const originalLanding = (doc.landing_page ?? {});

  try {
    const deckLanding = { ...originalLanding, viewer_mode: "deck", viewer_page_count: 9 };
    const { error: deckError } = await supabase.from("documents").update({ landing_page: deckLanding }).eq("id", doc.id);
    if (deckError) throw deckError;

    const deckPage = await fetchText(`/s/${share.token}`);
    assert.equal(deckPage.response.status, 200, "Expected deck share route to load");
    assert.match(deckPage.text, /Presentation mode/i, "Expected deck mode messaging");
    assert.match(deckPage.text, /Slide 1 of 9/i, "Expected deck page count to match updated setting");

    const documentLanding = { ...originalLanding, viewer_mode: "document", viewer_page_count: 9 };
    const { error: documentError } = await supabase.from("documents").update({ landing_page: documentLanding }).eq("id", doc.id);
    if (documentError) throw documentError;

    const documentPage = await fetchText(`/s/${share.token}`);
    assert.equal(documentPage.response.status, 200, "Expected document share route to load");
    assert.match(documentPage.text, /Document mode/i, "Expected document mode messaging after admin-side update");

    console.log("viewer-persistence-e2e passed");
  } finally {
    await supabase.from("documents").update({ landing_page: originalLanding }).eq("id", doc.id);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
