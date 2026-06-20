export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-mn-text">{title}</h1>
        {subtitle && <p className="text-xs text-mn-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </div>
  );
}
