import { redirect } from "next/navigation";

export default async function LegacyDocsRedirect({ params }: { params: { slug: string } }) {
  redirect(`/d/${params.slug}`);
}
