import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAdminContextOrNull } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContextOrNull();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { fileName, mimeType } = (await request.json()) as { fileName?: string; mimeType?: string };

    if (!fileName || mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are supported." }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const extension = safeName.toLowerCase().endsWith(".pdf") ? "pdf" : "pdf";
    const storagePath = `${ctx.organizationId}/${Date.now()}-${randomUUID()}.${extension}`;

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage.from("documents").createSignedUploadUrl(storagePath);

    if (error || !data?.token) {
      return NextResponse.json({ error: error?.message ?? "Could not create signed upload URL." }, { status: 500 });
    }

    return NextResponse.json({ path: storagePath, token: data.token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
