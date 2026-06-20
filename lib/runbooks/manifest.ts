export interface RunbookMeta {
  slug: string;
  title: string;
  shortTitle: string;
  severity: string;
  number: number;
}

export const RUNBOOK_MANIFEST: RunbookMeta[] = [
  {
    slug: "runbook-01-dbsync",
    title: "Runbook 01 · DB Sync Failure & Chain Reorganisation",
    shortTitle: "DB Sync Failure & Chain Reorg",
    severity: "P1–P2",
    number: 1,
  },
  {
    slug: "runbook-02-peers",
    title: "Runbook 02 · Peer Misconfiguration / Low Peer Count",
    shortTitle: "Peer Misconfiguration",
    severity: "P3",
    number: 2,
  },
  {
    slug: "runbook-03-isolation",
    title: "Runbook 03 · Validator Isolation / Zero Peers",
    shortTitle: "Validator Isolation",
    severity: "P1–P2",
    number: 3,
  },
  {
    slug: "runbook-04-outage",
    title: "Runbook 04 · Node Outage",
    shortTitle: "Node Outage",
    severity: "P1–P3",
    number: 4,
  },
  {
    slug: "runbook-05-gateway",
    title: "Runbook 05 · Filtering Gateway Failure",
    shortTitle: "Filtering Gateway Failure",
    severity: "P1–P2",
    number: 5,
  },
  {
    slug: "runbook-06-upgrade",
    title: "Runbook 06 · Upgrade Ceremony Failure / FNO Deviation",
    shortTitle: "Upgrade Ceremony Failure",
    severity: "P2–P3",
    number: 6,
  },
  {
    slug: "runbook-07-finality",
    title: "Runbook 07 · Finality Stall",
    shortTitle: "Finality Stall",
    severity: "P1–P2",
    number: 7,
  },
  {
    slug: "runbook-08-cardano",
    title: "Runbook 08 · Cardano Node Sync Failure",
    shortTitle: "Cardano Node Sync Failure",
    severity: "P1–P2",
    number: 8,
  },
];
