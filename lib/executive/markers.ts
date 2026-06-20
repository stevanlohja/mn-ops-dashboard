import { NodeState } from "@/lib/telemetry/types";
import type { GlobeMarker } from "@/components/executive/ValidatorGlobe";

/**
 * Map telemetry nodes to globe markers — located FNO validators only.
 * Shared by the executive overview and board mode so the globe is fed
 * identically in both. (GlobeMarker is imported as a type only, so this stays
 * free of any React/runtime dependency.)
 */
export function toGlobeMarkers(nodes: NodeState[]): GlobeMarker[] {
  return nodes
    .filter((n) => n.isFno && n.latitude != null && n.longitude != null)
    .map((n) => ({
      name: n.name,
      city: n.city,
      lat: n.latitude as number,
      lng: n.longitude as number,
      online: true,
    }));
}
