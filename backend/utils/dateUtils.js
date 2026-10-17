const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Today's calendar date in the business timezone, stored as UTC midnight ("date key").
// Set TZ_OFFSET_MINUTES in .env (India = 330). Defaults to 0 (UTC).
const getToday = () => {
  const offset = Number(process.env.TZ_OFFSET_MINUTES) || 0;
  const local = new Date(Date.now() + offset * 60000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
};

// Strictly parses 'YYYY-MM-DD' into a date key. Returns null if invalid.
const parseDateKey = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
};

module.exports = { getToday, parseDateKey };