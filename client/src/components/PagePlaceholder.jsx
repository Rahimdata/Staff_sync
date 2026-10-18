import { Hammer } from 'lucide-react';

/** Temporary screen for pages that are built in a later step. */
export default function PagePlaceholder({ title, note }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Hammer size={22} />
      </span>
      <h2>{title}</h2>
      <p>{note ?? 'This screen is built in the next step.'}</p>
    </div>
  );
}