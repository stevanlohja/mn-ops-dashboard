"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/providers/ThemeProvider";

/**
 * Renders a mermaid diagram from the raw fenced-code text. Mermaid is imported
 * dynamically (client-only) so it never runs during SSR, and re-renders when the
 * dashboard theme flips so the diagram matches dark/light.
 */
let counter = 0;

export default function Mermaid({ chart }: { chart: string }) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${(counter += 1)}`;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "neutral",
          themeVariables: { fontFamily: "var(--font-outfit), system-ui, sans-serif" },
        });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, theme]);

  if (error) {
    return (
      <pre className="text-mn-p1 text-xs whitespace-pre-wrap">
        Diagram failed to render: {error}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
