import { useEffect, useState } from 'react';
import { AlertCircle, Check, Plus, X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { LEAVE_TYPE_LABELS, formatDateRange, leaveDays } from '../utils/format';
import Loader from './Loader';
import Pagination from './Pagination';
import StatusBadge from './StatusBadge';
import ConfirmModal from './ConfirmModal';
import LeaveRequestModal from './LeaveRequestModal';

/** Your own leave: history with status filter, new request, and withdraw-while-pending. */
export default function MyLeavePanel() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [leaves, setLeaves] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/leaves/my-leaves', { params: { status: status || undefined, page, limit: 10 } })
      .then(({ data }) => {
        if (cancelled) return;
        setLeaves(data.leaves);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your leave requests.'));
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

  const reload = () => setReloadKey((k) => k + 1);

  const cancelRequest = async () => {
    await api.delete(`/leaves/${cancelTarget._id}`);
    setNotice('Leave request cancelled.');
    reload();
  };

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>My leave</h2>
        <div className="page-head__actions">
          <select
            className="input input--plain input--select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All requests</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setRequestOpen(true)}>
            <Plus size={16} />
            Request leave
          </button>
        </div>
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

        {loading ? (
          <Loader label="Loading leave requests" />
        ) : leaves.length === 0 ? (
          <p className="muted empty-line">{status ? 'No requests with that status.' : 'No leave requests yet. Use “Request leave” to file your first one.'}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
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
                    <td>
                      {l.status === 'PENDING' && (
                        <button type="button" className="btn btn--sm btn--reject" onClick={() => setCancelTarget(l)} aria-label="Cancel this request">
                          <X size={15} />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && <Pagination page={page} pages={pages} total={total} onPage={setPage} noun="requests" />}
      </div>

      <LeaveRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onCreated={() => {
          setNotice('Leave request submitted.');
          setPage(1);
          reload();
        }}
      />

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel this request?"
        message="The request is withdrawn and your manager will no longer see it. You can file a new one any time."
        confirmLabel="Cancel request"
        danger
        onConfirm={cancelRequest}
        onClose={() => setCancelTarget(null)}
      />
    </section>
  );
}