import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LogIn, LogOut } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { formatDuration, formatTime, todayKey } from '../utils/format';
import Clock from './Clock';

/**
 * Compact check-in / check-out card for any role. Loads and updates its own state,
 * so managers and HR can mark attendance without a dedicated page.
 */
export default function MyDayCard() {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const today = todayKey();
    api
      .get('/attendance/my-attendance', { params: { from: today, to: today, limit: 1 } })
      .then(({ data }) => {
        if (!cancelled) setRecord(data.attendance[0] ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your attendance.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const act = async (path) => {
    setActing(true);
    setError('');
    try {
      const { data } = await api.post(path);
      setRecord(data.attendance);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const checkedIn = !!record?.checkInTime;
  const checkedOut = !!record?.checkOutTime;

  let status = 'You haven’t checked in yet.';
  if (checkedOut) status = `Checked out at ${formatTime(record.checkOutTime)}. You worked ${formatDuration(record.checkInTime, record.checkOutTime)}.`;
  else if (checkedIn) status = `Checked in at ${formatTime(record.checkInTime)}.`;

  return (
    <section className="panel my-day" aria-label="Your attendance today">
      <div className="my-day__text">
        <h2>Your day</h2>
        <p className="muted">{loading ? 'Loading…' : status}</p>
        {error && (
          <p className="row-error">
            <AlertCircle size={14} /> {error}
          </p>
        )}
      </div>

      <div className="my-day__right">
        <Clock />
        {!checkedIn && (
          <button type="button" className="btn btn--primary" onClick={() => act('/attendance/check-in')} disabled={acting || loading}>
            {acting ? <Loader2 size={17} className="spin" /> : <LogIn size={17} />}
            Check in
          </button>
        )}
        {checkedIn && !checkedOut && (
          <button type="button" className="btn btn--dark" onClick={() => act('/attendance/check-out')} disabled={acting}>
            {acting ? <Loader2 size={17} className="spin" /> : <LogOut size={17} />}
            Check out
          </button>
        )}
        {checkedOut && (
          <button type="button" className="btn btn--ghost" disabled>
            Done for today
          </button>
        )}
      </div>
    </section>
  );
}