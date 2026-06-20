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
  FEED_URL,
} from "@/lib/telemetry/networks";
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
});

export function useTelemetry() {
  return useContext(Ctx);
}

function readStoredNetwork(): NetworkId {
  if (typeof window === "undefined") return DEFAULT_NETWORK;
  const stored = localStorage.getItem("mn-network") as NetworkId | null;
  return stored && stored in NETWORKS ? stored : DEFAULT_NETWORK;
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkRaw] = useState<NetworkId>(readStoredNetwork);
  const [state, dispatch] = useReducer(
    telemetryReducer,
    0,
    (): TelemetryState => initialTelemetryState(Date.now())
  );
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);

  const setNetwork = useCallback((id: NetworkId) => {
    setNetworkRaw(id);
    if (typeof window !== "undefined") localStorage.setItem("mn-network", id);
  }, []);

  const genesis = NETWORKS[network].genesis;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Bump generation — any older connection becomes stale
    const gen = ++genRef.current;
    let retryCount = 0;

    dispatch({ type: "reset", now: Date.now() });
    setWsStatus("connecting");

    function isStale() {
      return genRef.current !== gen;
    }

    function connect() {
      if (isStale()) return;

      let ws: WebSocket;
      try {
        ws = new WebSocket(FEED_URL);
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
  }, [genesis]);

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
    };
  }, [state, wsStatus, network, setNetwork]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
