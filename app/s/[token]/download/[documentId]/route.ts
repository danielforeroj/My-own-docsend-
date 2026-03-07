import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkByToken, getValidAccessGrant } from "@/lib/share";

export async function GET(request: Request, { params }: { params: { token: string; documentId: string } }) {
  const link = await getShareLinkByToken(params.token);

  if (!link) {
    return new NextResponse("Not found", { status: 404 });
  }

  const accessGrant = await getValidAccessGrant(link.id);

  if (link.requires_intake && !accessGrant) {
    return NextResponse.redirect(new URL(`/s/${params.token}`, request.url));
  }

  const supabase = createAdminClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", params.documentId)
    .eq("organization_id", link.organization_id)
    .maybeSingle();

  if (!document) {
    return new NextResponse("Document not found", { status: 404 });
  }

  if (link.link_type === "document" && link.document_id !== document.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (link.link_type === "space" && link.space_id) {
    const { data: join } = await supabase
      .from("space_documents")
      .select("id")
      .eq("space_id", link.space_id)
      .eq("document_id", document.id)
      .maybeSingle();

    if (!join) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const { data: signed } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60 * 10);

  if (!signed?.signedUrl) {
    return new NextResponse("Could not create download URL", { status: 500 });
  }

  await supabase.from("downloads").insert({
    document_id: document.id,
    space_id: link.space_id,
    visitor_submission_id: accessGrant?.visitor_submission_id ?? null
  });

  return NextResponse.redirect(signed.signedUrl);
}
