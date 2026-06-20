import RunbookList from "@/components/runbooks/RunbookList";
import { RUNBOOK_MANIFEST } from "@/lib/runbooks/manifest";

export const metadata = {
  title: "Runbooks — PO Dash 2.0",
};

export default function RunbooksPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-mn-text">Runbooks</h1>
        <p className="text-xs text-mn-muted mt-0.5">
          Operational procedures for Midnight Network incidents
        </p>
      </div>
      <RunbookList runbooks={RUNBOOK_MANIFEST} />
    </div>
  );
}
