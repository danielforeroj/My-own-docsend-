import Link from "next/link";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";

export default function NewDocumentPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/documents" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to documents
      </Link>
      <h1 className="text-2xl font-semibold">Upload Document</h1>
      <p className="text-sm text-muted-foreground">Uploads are sent directly from your browser to Supabase Storage using a short-lived signed URL.</p>
      <DocumentUploadForm />
    </div>
  );
}
