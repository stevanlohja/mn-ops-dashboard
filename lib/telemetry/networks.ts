export type NetworkId = "mainnet" | "preprod" | "preview";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  genesis: string;
  /** Expected FNO validator set size, or null when not fixed (testnets) */
  expectedValidators: number | null;
  /** Expected libp2p peer count for a healthy validator, or null to skip peer alerts */
  expectedPeers: number | null;
  /**
   * Intended operating model at this stage of the network — stated by design,
   * not a health/decentralization score. Midnight currently runs a permissioned
   * federated set behind a guarded overlay; that is the goal, not a shortcoming.
   */
  model: string;
  modelNote: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: "mainnet",
    label: "Mainnet",
    genesis:
      "0x1941ca8e2bb88146c14dea084d3be7eb6e96ca7135429c543848b628124f2854",
    expectedValidators: 13,
    expectedPeers: 17,
    model: "Federated",
    modelNote: "Guarded overlay · by design",
  },
  preprod: {
    id: "preprod",
    label: "Preprod",
    genesis:
      "0xdf831b09a8baa92badf47762ce5ac439b7e47e3ed3d39600cfdd44fad552361b",
    expectedValidators: null,
    expectedPeers: null,
    model: "Federated",
    modelNote: "Guarded overlay · by design",
  },
  preview: {
    id: "preview",
    label: "Preview",
    genesis:
      "0x801d3fc306115a3b538ea9498881c176376f8e3213464fe620fc1f359d13b880",
    expectedValidators: null,
    expectedPeers: null,
    model: "Operated by Shielded",
    modelNote: "Single operator · by design",
  },
};

export const NETWORK_IDS = Object.keys(NETWORKS) as NetworkId[];
export const DEFAULT_NETWORK: NetworkId = "mainnet";
export const FEED_URL = "wss://telemetry.shielded.tools/feed/";
export const TELEMETRY_WEB_URL = "https://telemetry.shielded.tools";
