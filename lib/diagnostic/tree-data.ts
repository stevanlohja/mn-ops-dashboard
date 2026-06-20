export type Priority = "p1" | "p2" | "p3" | "ok" | "escalate";

export interface QuestionNode {
  type: "question";
  step: string;
  q: string;
  hint: string;
  yes: { label: string; next: NodeKey; crumb: string };
  no: { label: string; next: NodeKey; crumb: string };
}

export interface OutcomeNode {
  type: "outcome";
  priority: Priority;
  title: string;
  desc: string;
  actions: string[];
  runbookLabel: string | null;
  runbookSlug: string | null;
}

export interface HealthyNode {
  type: "healthy";
}

export type DiagnosticNode = QuestionNode | OutcomeNode | HealthyNode;

export type NodeKey =
  | "start"
  | "q2_incrementing"
  | "q_slow_monitor"
  | "q3_all_fno_visible"
  | "q4_node_on_telemetry"
  | "q4b_peer_zero"
  | "q4c_dbsync"
  | "q5_peer_count_zero"
  | "q5b_dbsync_all"
  | "q6_all_fno_visible_ok"
  | "q7_mesh_ok"
  | "q8_block_hash"
  | "q9_peer_count"
  | "q10_finality"
  | "rb01_dbsync_p1"
  | "rb01_reorg_p2"
  | "rb02_peers_p3"
  | "rb03_process_down_p1"
  | "rb03_isolation_p1"
  | "rb03_isolation_p2"
  | "rb03_process_p3"
  | "rb06_finality_p2"
  | "escalate_p1"
  | "monitor"
  | "healthy";

export const TOTAL_STEPS = 10;

export const TREE: Record<NodeKey, DiagnosticNode> = {
  start: {
    type: "question",
    step: "Step 1 of 10 — Block Production",
    q: 'Is the "Last Block" time greater than 30 seconds, or is "Average Time" significantly above 6s?',
    hint: 'Check: Top bar of the telemetry dashboard. Normal cadence is 6.000s. A Last Block time >30s is the primary stall indicator. Refresh the page once before acting.',
    yes: { label: "Yes — blocks appear stalled", next: "q2_incrementing", crumb: "Last Block >30s → YES" },
    no: { label: "No — timing looks normal", next: "q6_all_fno_visible_ok", crumb: "Last Block >30s → NO" },
  },

  q2_incrementing: {
    type: "question",
    step: "Step 2 of 10 — Best Block Check",
    q: 'Refresh the page. Is the "Best Block" number incrementing?',
    hint: 'Check: Top-left "BEST BLOCK" counter. Wait 15 seconds and refresh. If the number has not moved at all, block production has stopped.',
    yes: { label: "Yes — number is moving (slowly)", next: "q_slow_monitor", crumb: "Best Block moving → YES" },
    no: { label: "No — completely frozen", next: "q3_all_fno_visible", crumb: "Best Block moving → NO" },
  },

  q_slow_monitor: {
    type: "question",
    step: "Step 2b — Degraded Production",
    q: 'Is "Average Time" more than 2× the expected 6s (i.e. above ~12s)?',
    hint: 'Check: "AVERAGE TIME" in the top bar. Blocks producing but slowly may indicate a degraded validator set or propagation issue rather than a full stall.',
    yes: { label: "Yes — average time is very high", next: "q3_all_fno_visible", crumb: "Avg time high → YES" },
    no: { label: "No — just a brief blip", next: "monitor", crumb: "Avg time ok → NO" },
  },

  q3_all_fno_visible: {
    type: "question",
    step: "Step 3 of 10 — Validator Presence",
    q: "Are all 10 FNO validator nodes visible in the Mainnet list?",
    hint: "Check: FNO validators appear highlighted at the top of the list. There should be exactly 10. Names follow the pattern [fno]-validator-[name]. Count them.",
    yes: { label: "Yes — all 10 present", next: "q5_peer_count_zero", crumb: "All 10 FNOs visible → YES" },
    no: { label: "No — one or more missing", next: "q4_node_on_telemetry", crumb: "All 10 FNOs visible → NO" },
  },

  q4_node_on_telemetry: {
    type: "question",
    step: "Step 4 of 10 — Node Presence on Telemetry",
    q: "Does the missing FNO node appear anywhere in the telemetry list at all?",
    hint: "Check: Scroll the full list. Telemetry runs over the public internet independently of P2P networking — a running node should appear here even if its peer connections are down. If absent entirely, the node process itself has stopped.",
    yes: { label: "Yes — visible but not in validator set", next: "q4b_peer_zero", crumb: "Node on telemetry → YES" },
    no: { label: "No — not visible anywhere", next: "rb03_process_down_p1", crumb: "Node on telemetry → NO" },
  },

  q4b_peer_zero: {
    type: "question",
    step: "Step 4b — Mesh Connectivity Signal",
    q: "Does the node show a Peer Count of 0 (or very low, 1–2)?",
    hint: "Check: Peer Count column in the telemetry list for the affected node. FNO validators only connect to configured peers — a peer count of 0 means network connectivity has dropped even though the process is still running.",
    yes: { label: "Yes — peer count is 0 or near-zero", next: "rb03_isolation_p1", crumb: "Peer count 0 → YES" },
    no: { label: "No — has peers but stale block", next: "q4c_dbsync", crumb: "Peer count 0 → NO" },
  },

  q4c_dbsync: {
    type: "question",
    step: "Step 4c — DB Sync Check",
    q: "Check DB Sync logs on the affected node. Is there an error, rollback, or sync lag?",
    hint: "Check: SSH into the node and run: journalctl -u cardano-db-sync -n 100 --no-pager. Look for rollback messages, connection errors, or a block height significantly behind the network tip.",
    yes: { label: "Yes — DB Sync errors found", next: "rb01_dbsync_p1", crumb: "DB Sync error → YES" },
    no: { label: "No — DB Sync appears healthy", next: "escalate_p1", crumb: "DB Sync error → NO" },
  },

  q5_peer_count_zero: {
    type: "question",
    step: "Step 5 of 10 — Mesh Connectivity",
    q: "Do any FNO validator nodes show a Peer Count of 0?",
    hint: "Check: Scan the Peer Count column for all FNO validators. Any showing 0 have lost network connectivity — they are running but isolated from other validators. This is a likely cause of block stall if multiple nodes are affected.",
    yes: { label: "Yes — one or more show peer count 0", next: "rb03_isolation_p1", crumb: "Any peer count 0 → YES" },
    no: { label: "No — all have peers", next: "q5b_dbsync_all", crumb: "Any peer count 0 → NO" },
  },

  q5b_dbsync_all: {
    type: "question",
    step: "Step 5b — DB Sync Check",
    q: "Check DB Sync logs on Shielded-operated nodes. Are there errors, rollbacks, or sync lag?",
    hint: "Check: journalctl -u cardano-db-sync -n 100 --no-pager on STL nodes first (best security posture, most reliable). DB Sync is a hard dependency — if it falls behind or rolls back, it will manifest as block instability even with all validators present.",
    yes: { label: "Yes — DB Sync errors found", next: "rb01_dbsync_p1", crumb: "DB Sync errors → YES" },
    no: { label: "No — DB Sync healthy", next: "escalate_p1", crumb: "DB Sync errors → NO" },
  },

  q6_all_fno_visible_ok: {
    type: "question",
    step: "Step 6 of 10 — Validator Presence",
    q: "Are all 13 FNO validator nodes visible in the Mainnet list?",
    hint: "Check: FNO validators appear highlighted at the top of the list. Count them — there should be exactly 13.",
    yes: { label: "Yes — all 13 present", next: "q8_block_hash", crumb: "All 13 FNOs visible → YES" },
    no: { label: "No — one or more missing", next: "q7_mesh_ok", crumb: "All 13 FNOs visible → NO" },
  },

  q7_mesh_ok: {
    type: "question",
    step: "Step 7 of 10 — Mesh Connectivity Signal",
    q: "Is the missing node visible on telemetry with a Peer Count of 0?",
    hint: "Check: Scroll the full telemetry list. If the node appears but shows peer count 0, network connectivity has dropped. If it does not appear at all, the node process is down.",
    yes: { label: "Yes — visible, peer count 0", next: "rb03_isolation_p2", crumb: "Peer count 0 → YES" },
    no: { label: "No — not visible at all", next: "rb03_process_p3", crumb: "Peer count 0 → NO" },
  },

  q8_block_hash: {
    type: "question",
    step: "Step 8 of 10 — Fork Detection",
    q: "Do any two nodes share the same Block height but show a DIFFERENT Block Hash?",
    hint: 'Check: Sort the list by the "Block" column. Scan the "Block Hash" column for nodes at the same height. Identical heights with different hashes = two chains exist simultaneously. This is the primary reorg signal. Even a 1-block divergence warrants investigation.',
    yes: { label: "Yes — divergent hashes at same height", next: "rb01_reorg_p2", crumb: "Block hash divergence → YES" },
    no: { label: "No — all hashes align", next: "q9_peer_count", crumb: "Block hash divergence → NO" },
  },

  q9_peer_count: {
    type: "question",
    step: "Step 9 of 10 — Peer Count Check",
    q: "Is any FNO validator showing a Peer Count below 17?",
    hint: "Check: Peer Count column. The expected baseline for FNO validators is 17. Shielded infra nodes will show higher (~25). A count below 17 on an FNO indicates missing peers — likely a config issue with --reserved-nodes.",
    yes: { label: "Yes — one or more below 17", next: "rb02_peers_p3", crumb: "Peer count < 17 → YES" },
    no: { label: "No — all at baseline", next: "q10_finality", crumb: "Peer count < 17 → NO" },
  },

  q10_finality: {
    type: "question",
    step: "Step 10 of 10 — Finality Check",
    q: "Is the gap between Best Block and Finalized Block greater than 4?",
    hint: "Check: Top bar. Normal gap is 2 (e.g. Best #82,689 / Finalized #82,687). A gap of 4+ and growing indicates GRANDPA finality is lagging behind block production. This can escalate quickly.",
    yes: { label: "Yes — gap is > 4 and growing", next: "rb06_finality_p2", crumb: "Finality gap > 4 → YES" },
    no: { label: "No — gap is 2–3, stable", next: "healthy", crumb: "Finality gap ok → NO" },
  },

  // ── Outcomes ──────────────────────────────────────────────────────────────

  rb01_dbsync_p1: {
    type: "outcome",
    priority: "p1",
    title: "DB Sync Failure — Chain Reorganisation Risk",
    desc: "DB Sync is behind or rolling back. This is a hard dependency for Midnight validators. Left unresolved, this can cause shielded nodes and validators to diverge onto separate chains. A reorg window of 12+ minutes creates a double-spend exposure for exchanges.",
    actions: [
      "Restart DB Sync process and monitor sync lag vs network tip",
      "Check DB Sync version — ensure all nodes are on the patched release binary",
      "Watch block hashes across validators for divergence during recovery",
      "Alert Shielded Protocol Engineer if DB Sync cannot self-recover",
      "Do not declare resolution until Best Block and Finalized Block are aligned network-wide",
    ],
    runbookLabel: "Runbook 01 · DB Sync Failure & Chain Reorganisation",
    runbookSlug: null,
  },

  rb01_reorg_p2: {
    type: "outcome",
    priority: "p2",
    title: "Active Chain Reorganisation Detected",
    desc: "Two or more validators are on different canonical chains at the same block height. This may self-resolve, but a divergence lasting more than 2–3 minutes must be treated as a P1. The 12-minute reorg observed on 2026-03-23 originated from a DB Sync rollback — check DB Sync first.",
    actions: [
      "Record the diverging block heights and hashes immediately (screenshot telemetry)",
      "Check DB Sync logs on affected nodes for rollback events",
      "Monitor telemetry every 60 seconds — is the gap growing or closing?",
      "If divergence persists beyond 3 minutes → escalate to P1",
      "Notify FNO liaison — affected operators should not restart nodes without instruction",
    ],
    runbookLabel: "Runbook 01 · DB Sync Failure & Chain Reorganisation",
    runbookSlug: null,
  },

  rb02_peers_p3: {
    type: "outcome",
    priority: "p3",
    title: "Peer Misconfiguration / Low Peer Count",
    desc: "One or more FNO validators have fewer peers than expected (baseline: 17). This is typically caused by missing or incorrect --reserved-nodes arguments in the node config. In the short term the network continues operating, but a degraded peer set increases reorg risk.",
    actions: [
      "Contact affected FNO via designated Discord channel",
      "Request FNO paste their node config (--reserved-nodes, --reserved-only flags)",
      "Compare against the approved 3-flavour config baseline (Docker / bare metal / cloud)",
      "If config is wrong, walk FNO through correction using Leonard's 5-Step procedure",
      "Confirm peer count returns to 17 after config correction and node restart",
    ],
    runbookLabel: "Runbook 02 · Peer Misconfiguration / Low Peer Count",
    runbookSlug: null,
  },

  rb03_process_down_p1: {
    type: "outcome",
    priority: "p1",
    title: "Node Outage — FNO Validator Offline (Multiple)",
    desc: "One or more FNO validator nodes have dropped off telemetry entirely — the node process has stopped. With 10 FNO validators, losing more than 3 puts block production at risk (>33% threshold for AURA consensus).",
    actions: [
      "Immediately contact all affected FNOs via designated channel",
      "Count how many are offline — if 3 or more → P1 all-hands immediately",
      "Ask FNO to check node process: systemctl status midnight-node",
      "Request crash logs: journalctl -u midnight-node -n 200 --no-pager",
      "Attempt restart only after reviewing logs: systemctl restart midnight-node",
      "Do not ask FNO to upgrade or change config until node is back and synced to tip",
    ],
    runbookLabel: "Runbook 04 · Node Outage",
    runbookSlug: null,
  },

  rb03_isolation_p1: {
    type: "outcome",
    priority: "p1",
    title: "Validator Isolation — Zero Peers (Multiple Nodes)",
    desc: "Multiple validators are running and visible on telemetry but show zero peers — they cannot participate in consensus. Zero peers is a symptom with several possible causes. Work through the triage order below before assuming any single root cause. This is functionally equivalent to those validators being offline.",
    actions: [
      "1. Was the node recently restarted? Wait 2 minutes and recheck — peer discovery takes time",
      "2. Check --reserved-nodes config is correct and complete for each affected node",
      "3. Verify the node can reach its configured peers (test connectivity to known peer IPs)",
      "4. Verify static IP has not changed — a change breaks all configured peer connections",
      "5. Check host firewall and cloud security group — P2P port must be open to known peers",
      "6. Check genesis hash matches the current network (stale chain data after a reset?)",
      "7. None of the above → escalate to Protocol Engineer",
    ],
    runbookLabel: "Runbook 03 · Validator Isolation / Zero Peers",
    runbookSlug: null,
  },

  rb03_isolation_p2: {
    type: "outcome",
    priority: "p2",
    title: "Validator Isolation — Zero Peers (Single Node, Chain Healthy)",
    desc: "One FNO validator is running and visible on telemetry but shows zero peers — it is isolated from other validators. The chain is currently healthy but losing another validator would escalate to P1. Zero peers has multiple possible causes — work through triage in order.",
    actions: [
      "1. Was the node recently restarted? Wait 2 minutes and recheck peer count",
      "2. Check --reserved-nodes config — is it correct and complete?",
      "3. Verify the node can reach its configured peers (test connectivity to known peer IPs)",
      "4. Verify static IP has not changed since peer config was last distributed",
      "5. Check host firewall and cloud security group rules — P2P port must be open to known peers",
      "6. Check genesis hash matches the current network (stale chain data after a reset?)",
      "7. If not resolved within 30 minutes → escalate to P1",
    ],
    runbookLabel: "Runbook 03 · Validator Isolation / Zero Peers",
    runbookSlug: null,
  },

  rb03_process_p3: {
    type: "outcome",
    priority: "p3",
    title: "Node Outage — Single Validator (Chain Healthy)",
    desc: "One FNO validator has dropped off telemetry entirely. The chain is producing blocks normally but losing further validators would escalate severity. The node process has stopped on this machine.",
    actions: [
      "Contact affected FNO — check node process: systemctl status midnight-node",
      "Request crash logs: journalctl -u midnight-node -n 200 --no-pager",
      "Attempt restart after reviewing logs: systemctl restart midnight-node",
      "Monitor telemetry — node should reappear within 2–3 minutes of a clean restart",
      "If not recovered within 2 hours → escalate to P2",
    ],
    runbookLabel: "Runbook 04 · Node Outage",
    runbookSlug: null,
  },

  rb06_finality_p2: {
    type: "outcome",
    priority: "p2",
    title: "Finality Stall — GRANDPA Lagging",
    desc: "The gap between Best Block and Finalized Block is growing. GRANDPA finality requires 2/3 of validators to be online and in agreement. A growing gap indicates the network cannot reach finality quorum — check validator set health immediately.",
    actions: [
      "Count active validators on telemetry — check all 10 FNOs are present with healthy peer counts",
      "If validators are missing, resolve their outage first (Runbook 03)",
      "If all validators present — check for block hash divergence (potential reorg)",
      "Escalate to Protocol Engineer if gap exceeds 10 blocks or continues growing",
      "Do not trigger any upgrades or restarts while finality is stalled",
    ],
    runbookLabel: "Runbook 07 · Finality Stall",
    runbookSlug: null,
  },

  escalate_p1: {
    type: "outcome",
    priority: "escalate",
    title: "Unknown Root Cause — Escalate Immediately",
    desc: "Block production is degraded or stalled, all validators are present, network connectivity appears healthy, and DB Sync shows no errors. The root cause is not diagnosable from telemetry alone. This requires Protocol Engineer intervention.",
    actions: [
      "Open P1 incident channel: #inc-YYYYMMDD-unknown-stall",
      "Declare Incident Commander immediately",
      "Page Protocol Engineer — do not wait",
      "Capture full telemetry screenshot and any available logs before escalating",
      "Do not restart nodes or change config without Protocol Engineer guidance",
    ],
    runbookLabel: "Escalate → Protocol Engineer",
    runbookSlug: null,
  },

  monitor: {
    type: "outcome",
    priority: "ok",
    title: "Transient Delay — Continue Monitoring",
    desc: "The last block time was briefly elevated but Best Block is incrementing normally and average time is within acceptable range. This appears to be a transient delay rather than a developing incident.",
    actions: [
      "Refresh telemetry every 2 minutes for the next 10 minutes",
      "If average time rises above 12s or stalls → restart diagnostic from Step 1",
      "No immediate action required",
    ],
    runbookLabel: null,
    runbookSlug: null,
  },

  healthy: {
    type: "healthy",
  },
};
