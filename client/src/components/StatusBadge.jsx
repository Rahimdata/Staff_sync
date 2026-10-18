const LABELS = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };

/** Leave status pill: Pending is yellow, Approved green, Rejected red. */
export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{LABELS[status] ?? status}</span>;
}