import Link from "next/link";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
import { isDemoMode } from "@/lib/runtime";

export default function NewDocumentPage() {
  const demo = isDemoMode();

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/documents" className="text-sm text-slate-600">
        ← Back to documents
      </Link>
      <h1 className="text-2xl font-semibold">Upload Document</h1>
      {demo ? (
        <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          Demo mode active. Upload is disabled until Supabase Storage is connected.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Uploads are sent directly from your browser to Supabase Storage using a short-lived signed URL.</p>
          <DocumentUploadForm />
        </>
      )}
    </div>
  );
}
