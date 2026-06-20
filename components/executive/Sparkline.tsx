/**
 * Minimal dependency-free sparkline. Renders a series into a normalised SVG
 * path with a soft area fill. Flat/short series degrade gracefully.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 32,
  className = "text-mn-accent-2",
  strokeWidth = 1.5,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
}) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = strokeWidth + 1;
  const innerH = height - pad * 2;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const gid = `spark-${pts.length}-${Math.round(min)}-${Math.round(max)}`;

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={strokeWidth + 0.5} fill="currentColor" />
    </svg>
  );
}
