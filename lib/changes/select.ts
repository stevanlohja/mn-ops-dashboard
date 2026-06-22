import { CHANGES } from "./data";
import { NetworkChange } from "./types";

/**
 * Changes with something currently happening — any environment in-progress or
 * scheduled. Used for the compact thumbnail on the overview. Pure.
 */
export function activeChanges(list: NetworkChange[] = CHANGES): NetworkChange[] {
  return list.filter((c) =>
    Object.values(c.envs).some(
      (e) => e.status === "in-progress" || e.status === "scheduled",
    ),
  );
}
