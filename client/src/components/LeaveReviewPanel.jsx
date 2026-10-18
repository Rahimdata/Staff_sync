import { useEffect, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { LEAVE_TYPE_LABELS, formatDateRange, leaveDays } from '../utils/format';
import Loader from './Loader';
import Pagination from './Pagination';
import StatusBadge from './StatusBadge';
import LeaveQueue from './LeaveQueue';

/**
 * Reviewer view. "Pending" shows the actionable queue; the other filters are read-only history.
 * The server scopes managers to their own team.
 */
export default function LeaveReviewPanel() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [leaves, setLeaves] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // /pending already excludes your own request; /all gives full history.
    const request =
      status === 'PENDING'
        ? api.get('/leaves/pending', { params: { page, limit: 10 } })
        : api.get('/leaves/all', { params: { status: status === 'ALL' ? undefined : status, page, limit: 10 } });

    request
      .then(({ data }) => {
        if (cancelled) return;
        setLeaves(data.leaves);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load leave requests.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, reloadKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const handleReviewed = (leave) => {
    const verb = leave.status === 'APPROVED' ? 'Approved' : 'Rejected';
    const type = (LEAVE_TYPE_LABELS[leave.leaveType] ?? 'leave').toLowerCase();
    setNotice(`${verb} ${leave.userId?.name ?? 'the employee'}’s ${type}.`);
    setReloadKey((k) => k + 1);
  };

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Requests to review</h2>
        <select
          className="input input--plain input--select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>

      <div className="panel__body">
        {error && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="alert alert--success" role="status">
            <Check size={18} />
            <span>{notice}</span>
          </div>
        )}

        {status === 'PENDING' ? (
          <LeaveQueue leaves={leaves} loading={loading} onReviewed={handleReviewed} />
        ) : loading ? (
          <Loader label="Loading leave requests" />
        ) : leaves.length === 0 ? (
          <p className="muted empty-line">No requests to show.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Request</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <strong>{l.userId?.name ?? 'Former employee'}</strong>
                      <span className="muted clamp">{l.userId?.department ?? ''}</span>
                    </td>
                    <td>
                      <strong>{LEAVE_TYPE_LABELS[l.leaveType] ?? l.leaveType}</strong>
                      <span className="muted clamp" title={l.reason}>
                        {l.reason}
                      </span>
                    </td>
                    <td>{formatDateRange(l.startDate, l.endDate)}</td>
                    <td>{leaveDays(l.startDate, l.endDate)}</td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td>{l.reviewedBy?.name ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && <Pagination page={page} pages={pages} total={total} onPage={setPage} noun="requests" />}
      </div>
    </section>
  );
}