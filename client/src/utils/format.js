const pad = (n) => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD in the browser's local time. */
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Dates from the API are calendar dates stored at UTC midnight, so they must be
 * formatted in UTC. Local formatting would shift them by a day in some timezones.
 */
export const formatDate = (iso, options = {}) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', ...options });

/** "28 Oct to 29 Oct 2026", or a single date when start and end match. */
export const formatDateRange = (start, end) => {
  if (start.slice(0, 10) === end.slice(0, 10)) return formatDate(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, sameYear ? { year: undefined } : {})} to ${formatDate(end)}`;
};

/** Inclusive number of days between two API dates. */
export const leaveDays = (start, end) => Math.round((new Date(end) - new Date(start)) / 86400000) + 1;

/** Clock times are real instants, so these use the viewer's local timezone. */
export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

/** "9h 8m" between two instants. */
export const formatDuration = (startIso, endIso) => {
  const minutes = Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/** "2 days ago", "yesterday", "just now". */
export const timeAgo = (iso) => {
  const seconds = (new Date(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
};

export const LEAVE_TYPE_LABELS = { SICK: 'Sick leave', CASUAL: 'Casual leave', ANNUAL: 'Annual leave', UNPAID: 'Unpaid leave' };