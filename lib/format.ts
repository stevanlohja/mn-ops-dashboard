/** Shared display formatters — pure functions, no React. */

export function formatBlockTime(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(3)}s`;
}

export function formatBlockNumber(n: number): string {
  return n > 0 ? `#${n.toLocaleString()}` : "—";
}

export function shortHash(hash: string, chars = 10): string {
  if (!hash) return "—";
  return `${hash.slice(0, chars)}…`;
}

export function formatDuration(ms: number): string {
  if (ms < 0) return "—";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatUptime(startupTime: number | null, now: number): string {
  if (!startupTime) return "Unknown";
  const diff = now - startupTime;
  if (diff < 0) return "Unknown";
  return formatDuration(diff);
}

export function formatAgo(timestamp: number | null, now: number): string {
  if (!timestamp) return "—";
  const sec = (now - timestamp) / 1000;
  if (sec < 1) return "now";
  if (sec < 60) return `${Math.floor(sec)}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ago`;
}

export function formatUtc(timestamp: number): string {
  return new Date(timestamp).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
