export default function Stat({
  label,
  value,
  valueClass = "text-mn-text",
  sub,
  small,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-mn-surface px-4 py-4">
      <p className="text-xs text-mn-muted uppercase tracking-wider mb-1">{label}</p>
      <p
        className={`${small ? "text-sm truncate" : "text-xl"} font-mono font-semibold ${valueClass}`}
        title={small ? value : undefined}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] font-mono text-mn-muted truncate mt-0.5" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}
