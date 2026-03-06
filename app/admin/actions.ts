"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function uploadDocument(formData: FormData) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const file = formData.get("file");
  const title = String(formData.get("title") || "").trim();

  if (!(file instanceof File) || !file.size) {
    throw new Error("A PDF file is required.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are supported.");
  }

  if (!title) {
    throw new Error("Document title is required.");
  }

  const storagePath = `${ctx.organizationId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await supabase.from("documents").insert({
    organization_id: ctx.organizationId,
    uploaded_by: ctx.userId,
    title,
    storage_path: storagePath,
    file_size: file.size,
    mime_type: file.type
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/admin/documents");
}

export async function createSpace(formData: FormData) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const documentIds = formData.getAll("document_ids").map(String);

  if (!name) {
    throw new Error("Space name is required.");
  }

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .insert({
      organization_id: ctx.organizationId,
      created_by: ctx.userId,
      name,
      slug,
      description: description || null
    })
    .select("id")
    .single();

  if (spaceError || !space) {
    throw new Error(spaceError?.message ?? "Failed to create space");
  }

  if (documentIds.length > 0) {
    const { error: joinError } = await supabase.from("space_documents").insert(
      documentIds.map((documentId, index) => ({
        space_id: space.id,
        document_id: documentId,
        position: index
      }))
    );

    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  revalidatePath("/admin/spaces");
}

export async function updateSpace(spaceId: string, formData: FormData) {
  await requireAdminContext();
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const active = formData.get("is_active") === "on";
  const documentIds = formData.getAll("document_ids").map(String);

  if (!name) {
    throw new Error("Space name is required.");
  }

  const { error: updateError } = await supabase
    .from("spaces")
    .update({ name, description: description || null, is_active: active, updated_at: new Date().toISOString() })
    .eq("id", spaceId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteError } = await supabase.from("space_documents").delete().eq("space_id", spaceId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (documentIds.length > 0) {
    const { error: joinError } = await supabase.from("space_documents").insert(
      documentIds.map((documentId, index) => ({
        space_id: spaceId,
        document_id: documentId,
        position: index
      }))
    );

    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  revalidatePath("/admin/spaces");
}
