import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { formatDate, formatDuration, formatTime } from '../utils/format';
import Loader from './Loader';
import Pagination from './Pagination';

const BADGE = { PRESENT: 'approved', ABSENT: 'rejected', LEAVE: 'pending' };
const LABEL = { PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'On leave' };

/**
 * Filterable, paginated attendance table.
 *  - endpoint '/attendance/my-attendance': your own records (date filters only)
 *  - endpoint '/attendance/all': HR/manager view with employee + status filters
 *
 * @param {{ title: string, endpoint: string, people?: object[], showEmployee?: boolean }} props
 */
export default function AttendanceHistory({ title, endpoint, people = [], showEmployee = false }) {
  const [filters, setFilters] = useState({ from: '', to: '', userId: '', status: '' });
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(endpoint, {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          userId: filters.userId || undefined,
          status: filters.status || undefined,
          page,
          limit: 10,
        },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setRecords(data.attendance);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load attendance.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, filters, page]);

  const setFilter = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    setPage(1);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{title}</h2>
      </div>

      <div className="toolbar">
        {showEmployee && (
          <select className="input input--plain input--select" value={filters.userId} onChange={setFilter('userId')} aria-label="Filter by employee">
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <label className="toolbar__field">
          <span>From</span>
          <input type="date" className="input input--plain input--select" value={filters.from} max={filters.to || undefined} onChange={setFilter('from')} />
        </label>
        <label className="toolbar__field">
          <span>To</span>
          <input type="date" className="input input--plain input--select" value={filters.to} min={filters.from || undefined} onChange={setFilter('to')} />
        </label>
        {showEmployee && (
          <select className="input input--plain input--select" value={filters.status} onChange={setFilter('status')} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">On leave</option>
          </select>
        )}
        {hasFilters && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => {
              setFilters({ from: '', to: '', userId: '', status: '' });
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="panel__body">
        {error && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <Loader label="Loading attendance" />
        ) : records.length === 0 ? (
          <p className="muted empty-line">No attendance records match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {showEmployee && <th>Employee</th>}
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    {showEmployee && (
                      <td>
                        <strong>{r.userId?.name ?? 'Former employee'}</strong>
                        <span className="muted clamp">{r.userId?.department ?? ''}</span>
                      </td>
                    )}
                    <td>{formatDate(r.date, { weekday: 'short' })}</td>
                    <td>{formatTime(r.checkInTime) || '–'}</td>
                    <td>{formatTime(r.checkOutTime) || '–'}</td>
                    <td>{r.checkInTime && r.checkOutTime ? formatDuration(r.checkInTime, r.checkOutTime) : '–'}</td>
                    <td>
                      <span className={`status-badge status-badge--${BADGE[r.status] ?? 'neutral'}`}>{LABEL[r.status] ?? r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && <Pagination page={page} pages={pages} total={total} onPage={setPage} />}
      </div>
    </section>
  );
}