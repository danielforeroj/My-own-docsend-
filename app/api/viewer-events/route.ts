/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

type ViewerEventPayload = {
  documentId?: string;
  spaceId?: string;
  shareToken?: string | null;
  page?: number;
  mode?: string;
  event?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ViewerEventPayload;

    if (!payload.documentId && !payload.spaceId && !payload.shareToken) {
      return NextResponse.json({ ok: false, error: "Missing required event fields." }, { status: 400 });
    }

    const supabase = createAdminClientOrNull() as any;
    if (!supabase) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    let documentId: string | null = null;
    let spaceId: string | null = null;

    if (payload.shareToken) {
      const { data: link } = await supabase
        .from("share_links")
        .select("document_id, space_id")
        .eq("token", payload.shareToken)
        .maybeSingle();
      documentId = link?.document_id ?? null;
      spaceId = link?.space_id ?? null;
    }

    if (!documentId && payload.documentId) {
      if (isUuid(payload.documentId)) {
        documentId = payload.documentId;
      } else {
        const { data: doc } = await supabase.from("documents").select("id").eq("public_slug", payload.documentId).eq("visibility", "public").maybeSingle();
        documentId = doc?.id ?? null;
      }
    }

    if (!spaceId && payload.spaceId) {
      if (isUuid(payload.spaceId)) {
        spaceId = payload.spaceId;
      } else {
        const { data: space } = await supabase.from("spaces").select("id").eq("public_slug", payload.spaceId).eq("visibility", "public").maybeSingle();
        spaceId = space?.id ?? null;
      }
    }

    if (!documentId && !spaceId) {
      return NextResponse.json({ ok: false, error: "Could not resolve event target." }, { status: 400 });
    }

    const headerStore = await headers();
    const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = headerStore.get("user-agent") || "unknown";
    const fingerprint = createHash("sha256")
      .update(`${documentId ?? "none"}:${spaceId ?? "none"}:${forwardedFor}:${userAgent}`)
      .digest("hex");

    const startedAt = new Date().toISOString();
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 30).toISOString();

    const duplicateQuery = supabase
      .from("view_sessions")
      .select("id")
      .eq("viewer_fingerprint", fingerprint)
      .gte("created_at", recentThreshold)
      .limit(1);

    const scopedDuplicate = documentId ? duplicateQuery.eq("document_id", documentId) : duplicateQuery.eq("space_id", spaceId!);
    const { data: existing } = await scopedDuplicate;

    if (!existing?.length) {
      await supabase.from("view_sessions").insert({
        document_id: documentId,
        space_id: spaceId,
        viewer_fingerprint: fingerprint,
        started_at: startedAt,
        ended_at: startedAt
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid event payload." }, { status: 400 });
  }
}
