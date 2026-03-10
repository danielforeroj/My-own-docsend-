import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const adminCookie = process.env.ADMIN_SESSION_COOKIE;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const organizationId = process.env.TEST_ORGANIZATION_ID;

if (!adminCookie || !supabaseUrl || !serviceKey || !organizationId) {
  console.log("Skipping authenticated slug uniqueness e2e: missing ADMIN_SESSION_COOKIE, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or TEST_ORGANIZATION_ID.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);
const suffix = Date.now().toString(36);
const docSlug = `slug-e2e-${suffix}`;
const spaceSlug = `slug-e2e-space-${suffix}`;

async function check(namespace, slug, expectedAvailable) {
  const res = await fetch(`${baseUrl}/api/admin/slugs/check?namespace=${namespace}&slug=${slug}`, {
    headers: { cookie: adminCookie }
  });
  if (!res.ok) throw new Error(`slug check failed (${namespace}/${slug}): ${res.status}`);
  const payload = await res.json();
  if (payload.available !== expectedAvailable) {
    throw new Error(`expected available=${expectedAvailable} for ${namespace}/${slug}, got ${payload.available}`);
  }
}

async function run() {
  const { data: membership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  if (!membership?.user_id) {
    throw new Error("No membership found for TEST_ORGANIZATION_ID");
  }

  const userId = membership.user_id;

  const { error: docError } = await supabase.from("documents").insert({
    organization_id: organizationId,
    uploaded_by: userId,
    title: `Slug E2E Doc ${suffix}`,
    storage_path: `${organizationId}/e2e-${suffix}.pdf`,
    mime_type: "application/pdf",
    public_slug: docSlug
  });
  if (docError) throw docError;

  const { error: spaceError } = await supabase.from("spaces").insert({
    organization_id: organizationId,
    created_by: userId,
    name: `Slug E2E Space ${suffix}`,
    slug: `space-internal-${suffix}`,
    public_slug: spaceSlug
  });
  if (spaceError) throw spaceError;

  try {
    await check("document", docSlug, false);
    await check("document", `${docSlug}-new`, true);
    await check("space", spaceSlug, false);
    await check("space", `${spaceSlug}-new`, true);
    console.log("authenticated slug uniqueness e2e passed");
  } finally {
    await supabase.from("documents").delete().eq("organization_id", organizationId).eq("public_slug", docSlug);
    await supabase.from("spaces").delete().eq("organization_id", organizationId).eq("public_slug", spaceSlug);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
