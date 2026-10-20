import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { LEAVE_TYPE_LABELS, todayKey } from '../utils/format';
import Modal from './Modal';

const MAX_REASON = 500;

function LeaveForm({ onClose, onCreated }) {
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = todayKey();

  // Mirrors the server's rules so people get instant feedback. The server still has the final say.
  const validate = () => {
    if (!startDate || !endDate) return 'Choose a start and an end date.';
    if (endDate < startDate) return 'The end date cannot be before the start date.';
    if (startDate < today) return 'The start date cannot be in the past.';
    if (!reason.trim()) return 'Add a short reason for your request.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/leaves/apply', { leaveType, startDate, endDate, reason: reason.trim() });
      onCreated(data.leave);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your request. Try again.'));
      setSubmitting(false);
    }
  };

  return (
    <form id="leave-form" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor="leaveType">
          Leave type
        </label>
        <select id="leaveType" className="input input--plain" value={leaveType} onChange={(e) => setLeaveType(e.target.value)} disabled={submitting}>
          {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="startDate">
            From
          </label>
          <input
            id="startDate"
            type="date"
            className="input input--plain"
            value={startDate}
            min={today}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate && e.target.value > endDate) setEndDate(e.target.value);
            }}
            disabled={submitting}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="endDate">
            To
          </label>
          <input id="endDate" type="date" className="input input--plain" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)} disabled={submitting} />
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="reason">
          Reason
        </label>
        <textarea
          id="reason"
          className="input input--plain input--area"
          rows={4}
          maxLength={MAX_REASON}
          placeholder="What should your manager know?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
        />
        <span className="field__count">
          {reason.length}/{MAX_REASON}
        </span>
      </div>

      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={17} className="spin" />
              Submitting
            </>
          ) : (
            'Submit request'
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * @param {{ open: boolean, onClose: () => void, onCreated: (leave: object) => void }} props
 */
export default function LeaveRequestModal({ open, onClose, onCreated }) {
  return (
    <Modal open={open} title="Request leave" onClose={onClose}>
      <LeaveForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}