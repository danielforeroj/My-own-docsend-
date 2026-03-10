/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAdminContextOrNull } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSlugFormat, normalizeSlug } from "@/lib/slug";


export async function GET(request: Request) {
  const ctx = await getAdminContextOrNull();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const namespace = searchParams.get("namespace");
  const rawSlug = searchParams.get("slug") || "";
  const excludeId = searchParams.get("excludeId");

  if (namespace !== "document" && namespace !== "space") {
    return NextResponse.json({ available: false, message: "Invalid slug namespace." }, { status: 400 });
  }

  const slug = normalizeSlug(rawSlug);
  if (!slug) {
    return NextResponse.json({ available: false, normalizedSlug: slug, message: "Slug is required." });
  }

  if (!isValidSlugFormat(slug)) {
    return NextResponse.json({ available: false, normalizedSlug: slug, message: "Use lowercase letters, numbers, and hyphens." });
  }

  const table = namespace === "document" ? "documents" : "spaces";
  const supabase = (await createClient()) as any;
  let query = supabase.from(table).select("id").eq("organization_id", ctx.organizationId).eq("public_slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;

  if (data?.length) {
    return NextResponse.json({ available: false, normalizedSlug: slug, message: "That slug is already in use." });
  }

  return NextResponse.json({ available: true, normalizedSlug: slug });
}
