/** Browser-side file download / clipboard helpers (no server involved). */

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

export function reportFilename(networkLabel: string, generatedAtMs: number, ext: string): string {
  const d = new Date(generatedAtMs);
  const stamp = d.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  return `midnight-${networkLabel.toLowerCase()}-health-report-${stamp}utc.${ext}`;
}
