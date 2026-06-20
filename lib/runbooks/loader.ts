/**
 * Static import registry for all runbook MDX files.
 * Dynamic template literal imports can have webpack resolution issues;
 * this explicit map guarantees all files are included in the bundle.
 */

export type RunbookImporter = () => Promise<{ default: React.ComponentType }>;

export const RUNBOOK_IMPORTERS: Record<string, RunbookImporter> = {
  "runbook-01-dbsync": () => import("@/content/runbooks/runbook-01-dbsync.md"),
  "runbook-02-peers": () => import("@/content/runbooks/runbook-02-peers.md"),
  "runbook-03-isolation": () => import("@/content/runbooks/runbook-03-isolation.md"),
  "runbook-04-outage": () => import("@/content/runbooks/runbook-04-outage.md"),
  "runbook-05-gateway": () => import("@/content/runbooks/runbook-05-gateway.md"),
  "runbook-06-upgrade": () => import("@/content/runbooks/runbook-06-upgrade.md"),
  "runbook-07-finality": () => import("@/content/runbooks/runbook-07-finality.md"),
  "runbook-08-cardano": () => import("@/content/runbooks/runbook-08-cardano.md"),
};
