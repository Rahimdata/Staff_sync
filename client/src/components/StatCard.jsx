/**
 * Metric tile used on every dashboard.
 * @param {{ icon: import('react').ComponentType<any>, label: string, value: string|number, hint?: string }} props
 */
export default function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="panel stat-card">
      <span className="stat-card__icon">
        <Icon size={19} strokeWidth={1.75} />
      </span>
      <div>
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {hint && <p className="stat-card__hint">{hint}</p>}
      </div>
    </div>
  );
}