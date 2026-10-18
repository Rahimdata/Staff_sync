import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { LEAVE_TYPE_LABELS, formatDateRange, leaveDays } from '../utils/format';
import Loader from './Loader';

const without = (obj, key) => {
  const { [key]: removed, ...rest } = obj;
  return rest;
};

/**
 * Pending-leave review table with Approve / Reject per row.
 * The server enforces who may review what (managers: their team only, nobody: their own).
 *
 * @param {{
 *   leaves: object[],
 *   loading: boolean,
 *   onReviewed: (updatedLeave: object) => void,
 *   emptyText?: string,
 * }} props
 */
export default function LeaveQueue({ leaves, loading, onReviewed, emptyText = 'No pending requests. You’re all caught up.' }) {
  const [busy, setBusy] = useState({}); // { [leaveId]: 'APPROVED' | 'REJECTED' }
  const [errors, setErrors] = useState({}); // { [leaveId]: message }

  const review = async (leave, status) => {
    if (busy[leave._id]) return;
    setBusy((prev) => ({ ...prev, [leave._id]: status }));
    setErrors((prev) => without(prev, leave._id));
    try {
      const { data } = await api.put(`/leaves/${leave._id}/status`, { status });
      onReviewed(data.leave);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [leave._id]: getErrorMessage(err, 'Could not update this request.') }));
    } finally {
      setBusy((prev) => without(prev, leave._id));
    }
  };

  if (loading) return <Loader label="Loading leave requests" />;
  if (leaves.length === 0) return <p className="muted empty-line">{emptyText}</p>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Request</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((leave) => {
            const name = leave.userId?.name ?? 'Former employee';
            const working = busy[leave._id];
            return (
              <tr key={leave._id}>
                <td>
                  <strong>{name}</strong>
                  <span className="muted clamp">{leave.userId?.department ?? ''}</span>
                </td>
                <td>
                  <strong>{LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType}</strong>
                  <span className="muted clamp" title={leave.reason}>
                    {leave.reason}
                  </span>
                </td>
                <td>{formatDateRange(leave.startDate, leave.endDate)}</td>
                <td>{leaveDays(leave.startDate, leave.endDate)}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn--sm btn--approve" onClick={() => review(leave, 'APPROVED')} disabled={!!working} aria-label={`Approve ${name}’s request`}>
                      {working === 'APPROVED' ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                      Approve
                    </button>
                    <button type="button" className="btn btn--sm btn--reject" onClick={() => review(leave, 'REJECTED')} disabled={!!working} aria-label={`Reject ${name}’s request`}>
                      {working === 'REJECTED' ? <Loader2 size={15} className="spin" /> : <X size={15} />}
                      Reject
                    </button>
                  </div>
                  {errors[leave._id] && <p className="row-error">{errors[leave._id]}</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}