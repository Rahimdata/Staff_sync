import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import Modal from './Modal';

function ResetForm({ employee, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      setError('The password needs at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/users/${employee._id}/password`, { newPassword: password });
      onDone(employee.name);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset the password. Try again.'));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <p className="confirm__text">
        Set a temporary password for <strong>{employee.name}</strong>. They are signed out everywhere and can change it from their profile after signing in.
      </p>
      <div className="field">
        <label className="field__label" htmlFor="resetPw">
          Temporary password
        </label>
        <input id="resetPw" type="password" className="input input--plain" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={submitting} autoFocus />
        <span className="field__count">At least 8 characters</span>
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? <Loader2 size={17} className="spin" /> : null}
          Reset password
        </button>
      </div>
    </form>
  );
}

/** @param {{ open: boolean, employee: object|null, onClose: () => void, onDone: (name: string) => void }} props */
export default function ResetPasswordModal({ open, employee, onClose, onDone }) {
  return (
    <Modal open={open} title="Reset password" onClose={onClose} width={460}>
      {employee && <ResetForm employee={employee} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}