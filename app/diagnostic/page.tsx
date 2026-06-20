import DiagnosticTree from "@/components/diagnostic/DiagnosticTree";
import { TELEMETRY_WEB_URL } from "@/lib/telemetry/networks";

export const metadata = {
  title: "Diagnostic — PO Dash 2.0",
};

export default function DiagnosticPage() {
  return (
    <div>
      <div className="border-b border-mn-border bg-mn-surface">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-base font-semibold text-mn-text">Incident Diagnostic</h1>
          <p className="text-xs text-mn-muted mt-0.5">
            Answer each question based on what you observe in{" "}
            <a
              href={TELEMETRY_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mn-accent underline underline-offset-2"
            >
              telemetry.shielded.tools
            </a>
          </p>
        </div>
      </div>
      <DiagnosticTree />
    </div>
  );
}
