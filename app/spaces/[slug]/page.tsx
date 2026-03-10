import { redirect } from "next/navigation";

export default async function LegacySpacesRedirect({ params }: { params: { slug: string } }) {
  redirect(`/sp/${params.slug}`);
}
