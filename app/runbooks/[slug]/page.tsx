import Link from "next/link";
import { notFound } from "next/navigation";
import { RUNBOOK_IMPORTERS } from "@/lib/runbooks/loader";
import { RUNBOOK_MANIFEST } from "@/lib/runbooks/manifest";

export function generateStaticParams() {
  return RUNBOOK_MANIFEST.map((rb) => ({ slug: rb.slug }));
}

export default async function RunbookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const importer = RUNBOOK_IMPORTERS[slug];
  if (!importer) notFound();

  const { default: Content } = await importer();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/runbooks"
        className="inline-flex items-center gap-1.5 text-xs text-mn-muted hover:text-mn-text transition-colors mb-5"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All runbooks
      </Link>
      <article className="prose-runbook">
        <Content />
      </article>
    </div>
  );
}
