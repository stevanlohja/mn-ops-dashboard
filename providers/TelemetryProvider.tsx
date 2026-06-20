"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { NodeState, NetworkSummary, WsStatus } from "@/lib/telemetry/types";
import { parseFeedMessage } from "@/lib/telemetry/feed";
import {
  NetworkId,
  NETWORKS,
  DEFAULT_NETWORK,
} from "@/lib/telemetry/networks";
import {
  DEFAULT_FEED_URLS,
  FEED_ENDPOINTS_STORAGE_KEY,
  normalizeFeedUrls,
} from "@/lib/telemetry/endpoints";
import {
  telemetryReducer,
  initialTelemetryState,
  TelemetryState,
} from "@/lib/state/telemetry-reducer";
import { AttestationRecord, AuthoredBlock } from "@/lib/attestation/types";

/**
 * React binding for the telemetry store. All domain logic lives in
 * lib/state/telemetry-reducer.ts — this provider only owns:
 *   - the WebSocket lifecycle (connect, resubscribe, backoff, teardown)
 *   - network selection persistence
 *   - dispatching parsed event batches into the reducer
 */
interface TelemetryCtx {
  nodes: NodeState[];
  summary: NetworkSummary | null;
  wsStatus: WsStatus;
  network: NetworkId;
  setNetwork: (id: NetworkId) => void;
  attestation: AttestationRecord[];
  recentBlocks: AuthoredBlock[];
  totalAttributed: number;
  sessionStartedAt: number;
  lastBlockProducer: string | null;
  /** Ordered telemetry feed endpoints (primary first, then fallbacks). */
  feedUrls: string[];
  setFeedUrls: (urls: string[]) => void;
  /** The endpoint the WebSocket is currently using / attempting. */
  activeFeedUrl: string;
}

const Ctx = createContext<TelemetryCtx>({
  nodes: [],
  summary: null,
  wsStatus: "connecting",
  network: DEFAULT_NETWORK,
  setNetwork: () => {},
  attestation: [],
  recentBlocks: [],
  totalAttributed: 0,
  sessionStartedAt: 0,
  lastBlockProducer: null,
  feedUrls: [...DEFAULT_FEED_URLS],
  setFeedUrls: () => {},
  activeFeedUrl: DEFAULT_FEED_URLS[0],
});

export function useTelemetry() {
  return useContext(Ctx);
}

function readStoredNetwork(): NetworkId {
  if (typeof window === "undefined") return DEFAULT_NETWORK;
  const stored = localStorage.getItem("mn-network") as NetworkId | null;
  return stored && stored in NETWORKS ? stored : DEFAULT_NETWORK;
}

function readStoredFeedUrls(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_FEED_URLS];
  try {
    const raw = localStorage.getItem(FEED_ENDPOINTS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_FEED_URLS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeFeedUrls(parsed) : [...DEFAULT_FEED_URLS];
  } catch {
    return [...DEFAULT_FEED_URLS];
  }
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkRaw] = useState<NetworkId>(readStoredNetwork);
  const [state, dispatch] = useReducer(
    telemetryReducer,
    0,
    (): TelemetryState => initialTelemetryState(Date.now())
  );
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [feedUrls, setFeedUrlsRaw] = useState<string[]>(readStoredFeedUrls);
  const [activeFeedUrl, setActiveFeedUrl] = useState<string>(
    () => readStoredFeedUrls()[0]
  );
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);

  const setNetwork = useCallback((id: NetworkId) => {
    setNetworkRaw(id);
    if (typeof window !== "undefined") localStorage.setItem("mn-network", id);
  }, []);

  const setFeedUrls = useCallback((urls: string[]) => {
    const normalized = normalizeFeedUrls(urls);
    setFeedUrlsRaw(normalized);
    if (typeof window !== "undefined") {
      localStorage.setItem(FEED_ENDPOINTS_STORAGE_KEY, JSON.stringify(normalized));
    }
  }, []);

  const genesis = NETWORKS[network].genesis;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Bump generation — any older connection becomes stale
    const gen = ++genRef.current;
    let retryCount = 0;
    // Ordered endpoints (primary first). On each failed connection we advance
    // to the next one so the dashboard fails over when a provider is down.
    let endpointIdx = 0;
    const urls = feedUrls.length ? feedUrls : DEFAULT_FEED_URLS;

    dispatch({ type: "reset", now: Date.now() });
    setWsStatus("connecting");

    function isStale() {
      return genRef.current !== gen;
    }

    function connect() {
      if (isStale()) return;

      let ws: WebSocket;
      const url = urls[endpointIdx % urls.length];
      setActiveFeedUrl(url);
      try {
        ws = new WebSocket(url);
      } catch {
        if (!isStale()) setWsStatus("error");
        return;
      }

      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (isStale()) {
          ws.close();
          return;
        }
        retryCount = 0;
        setWsStatus("live");
        try {
          ws.send(`subscribe:${genesis}`);
        } catch {
          /* ignore */
        }
      };

      ws.onmessage = (evt) => {
        if (isStale()) return;

        let raw: string;
        if (typeof evt.data === "string") {
          raw = evt.data;
        } else if (evt.data instanceof ArrayBuffer) {
          raw = new TextDecoder().decode(evt.data);
        } else {
          return;
        }

        const events = parseFeedMessage(raw);
        if (events.length > 0) {
          dispatch({ type: "events", events, now: Date.now() });
        }
      };

      ws.onerror = () => {
        if (!isStale()) setWsStatus("error");
      };

      ws.onclose = () => {
        if (isStale()) return;
        wsRef.current = null;
        endpointIdx++; // fail over to the next endpoint on the next attempt
        const backoff = Math.min(30_000, 2_000 * Math.pow(1.5, retryCount));
        retryCount++;
        setWsStatus("fallback");
        retryTimerRef.current = setTimeout(() => connect(), backoff);
      };
    }

    connect();

    return () => {
      // gen is now stale — any in-flight messages will be ignored
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
    // Reconnect from scratch when the network OR the endpoint list changes.
  }, [genesis, feedUrls]);

  const value = useMemo<TelemetryCtx>(() => {
    const nodes = Array.from(state.nodes.values());
    const attestation = Array.from(state.attestation.values());
    return {
      nodes,
      summary: state.summary,
      wsStatus,
      network,
      setNetwork,
      attestation,
      recentBlocks: state.recentBlocks,
      totalAttributed: state.totalAttributed,
      sessionStartedAt: state.sessionStartedAt,
      lastBlockProducer: state.recentBlocks[0]?.authorName ?? null,
      feedUrls,
      setFeedUrls,
      activeFeedUrl,
    };
  }, [state, wsStatus, network, setNetwork, feedUrls, setFeedUrls, activeFeedUrl]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
