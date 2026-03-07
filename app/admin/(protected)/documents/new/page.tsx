import Link from "next/link";
import { uploadDocument } from "@/app/admin/actions";

export default function NewDocumentPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/documents" className="text-sm text-slate-600">
        ← Back to documents
      </Link>
      <h1 className="text-2xl font-semibold">Upload Document</h1>

      <form action={uploadDocument} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Title</label>
          <input name="title" required className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">PDF file</label>
          <input name="file" type="file" accept="application/pdf" required className="w-full" />
        </div>
        <button className="bg-slate-900 text-white" type="submit">
          Upload
        </button>
      </form>
    </div>
  );
}
