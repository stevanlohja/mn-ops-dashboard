import { notFound } from "next/navigation";
import { DOC_IMPORTERS } from "@/lib/docs/loader";

export function generateStaticParams() {
  return Object.keys(DOC_IMPORTERS)
    .filter((slug) => slug !== "")
    .map((slug) => ({ slug: slug.split("/") }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const importer = DOC_IMPORTERS[slug.join("/")];
  if (!importer) notFound();
  const { default: Content } = await importer();
  return <Content />;
}
