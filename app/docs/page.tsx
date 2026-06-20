import { notFound } from "next/navigation";
import { DOC_IMPORTERS } from "@/lib/docs/loader";

export default async function DocsHomePage() {
  const importer = DOC_IMPORTERS[""];
  if (!importer) notFound();
  const { default: Content } = await importer();
  return <Content />;
}
