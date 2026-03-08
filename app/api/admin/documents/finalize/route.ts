import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminContextOrNull } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/runtime";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContextOrNull();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
    }

    const { title, storagePath, fallbackFileSize, fallbackMimeType, visibility: visibilityInput, publicSlug, showInCatalog } = (await request.json()) as {
      title?: string;
      storagePath?: string;
      fallbackFileSize?: number;
      fallbackMimeType?: string;
      visibility?: "public" | "private";
      publicSlug?: string | null;
      showInCatalog?: boolean;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Document title is required." }, { status: 400 });
    }

    if (!storagePath?.startsWith(`${ctx.organizationId}/`)) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }

    const [folder, fileName] = storagePath.split(/\/(.+)/);

    const supabaseAdmin = createAdminClient();
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
    }

    const { data: objects, error: listError } = await supabaseAdmin.storage.from("documents").list(folder, { search: fileName, limit: 1 });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const object = objects?.find((item) => item.name === fileName);
    const metadata = (object?.metadata ?? {}) as { size?: number; mimetype?: string };

    const fileSize = metadata.size ?? fallbackFileSize ?? null;
    const mimeType = metadata.mimetype ?? fallbackMimeType ?? "application/pdf";

    const visibility = visibilityInput === "public" ? "public" : "private";
    const normalizedSlug = publicSlug ? String(publicSlug).trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") : null;

    if (mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Uploaded file must be a PDF." }, { status: 400 });
    }

    const supabase = await createClient();
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("documents").insert({
      organization_id: ctx.organizationId,
      uploaded_by: ctx.userId,
      title: title.trim(),
      storage_path: storagePath,
      file_size: fileSize,
      mime_type: mimeType,
      visibility,
      public_slug: visibility === "public" ? normalizedSlug : null,
      show_in_catalog: visibility === "public" ? Boolean(showInCatalog) : false
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    revalidatePath("/admin/documents");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
