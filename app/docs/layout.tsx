import DocsSidebar from "@/components/docs/DocsSidebar";
import { DOCS_MANIFEST } from "@/lib/docs/manifest";

export const metadata = {
  title: "Docs — PO Dash 2.0",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-60 shrink-0 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="mb-4">
            <h1 className="text-sm font-semibold text-mn-text">Documentation</h1>
            <p className="text-[11px] text-mn-muted mt-0.5">
              Mirrored from midnight-network-ops
            </p>
          </div>
          <DocsSidebar nodes={DOCS_MANIFEST} />
        </aside>
        <div className="min-w-0 flex-1">
          <article className="prose-runbook">{children}</article>
        </div>
      </div>
    </div>
  );
}
