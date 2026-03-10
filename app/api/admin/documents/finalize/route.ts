/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminContextOrNull } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSlug } from "@/lib/slug";

type UploadOptions = {
  normalizedSlug: string;
  safeViewerMode: "deck" | "document";
  safeViewerPageCount: number;
};

function parseUploadOptions(
  publicSlug: string | undefined,
  viewerMode: "deck" | "document" | undefined,
  viewerPageCount: number | undefined
): UploadOptions {
  const normalizedSlug = normalizeSlug(String(publicSlug ?? ""));
  const safeViewerMode: UploadOptions["safeViewerMode"] = viewerMode === "deck" ? "deck" : "document";
  const safeViewerPageCount = Number.isFinite(viewerPageCount)
    ? Math.max(1, Math.min(300, Math.round(Number(viewerPageCount))))
    : 12;

  return { normalizedSlug, safeViewerMode, safeViewerPageCount };
}

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContextOrNull();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, publicSlug, viewerMode, viewerPageCount, storagePath, fallbackFileSize, fallbackMimeType } = (await request.json()) as {
      title?: string;
      publicSlug?: string;
      viewerMode?: "deck" | "document";
      viewerPageCount?: number;
      storagePath?: string;
      fallbackFileSize?: number;
      fallbackMimeType?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Document title is required." }, { status: 400 });
    }

    if (!storagePath?.startsWith(`${ctx.organizationId}/`)) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }

    const slashIndex = storagePath.indexOf("/");
    if (slashIndex <= 0 || slashIndex >= storagePath.length - 1) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }

    const uploadOptions = parseUploadOptions(publicSlug, viewerMode, viewerPageCount);
    if (!uploadOptions.normalizedSlug) {
      return NextResponse.json({ error: "Document URL slug is required." }, { status: 400 });
    }

    const [folder, fileName] = storagePath.split(/\/(.+)/);
    if (!folder || !fileName) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: objects, error: listError } = await supabaseAdmin.storage.from("documents").list(folder, { search: fileName, limit: 1 });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const object = objects?.find((item) => item.name === fileName);
    const metadata = (object?.metadata ?? {}) as { size?: number; mimetype?: string };

    const fileSize = metadata.size ?? fallbackFileSize ?? null;
    const mimeType = metadata.mimetype ?? fallbackMimeType ?? "application/pdf";

    if (mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Uploaded file must be a PDF." }, { status: 400 });
    }

    const supabase = (await createClient()) as any;
    const { data: duplicate } = await supabase
      .from("documents")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("public_slug", uploadOptions.normalizedSlug)
      .limit(1);

    if (duplicate?.length) {
      return NextResponse.json({ error: "That document URL slug is already in use." }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("documents").insert({
      organization_id: ctx.organizationId,
      uploaded_by: ctx.userId,
      title: title.trim(),
      public_slug: uploadOptions.normalizedSlug,
      landing_page: {
        viewer_mode: uploadOptions.safeViewerMode,
        viewer_page_count: uploadOptions.safeViewerPageCount
      },
      storage_path: storagePath,
      file_size: fileSize,
      mime_type: mimeType
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
