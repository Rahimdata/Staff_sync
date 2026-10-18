import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getErrorMessage } from '../services/api';
import Modal from './Modal';

function ConfirmBody({ message, confirmLabel, danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(); // the caller performs the request and throws on failure
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <p className="confirm__text">{message}</p>
      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={17} className="spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </>
  );
}

/**
 * "Are you sure?" dialog for actions that are hard to undo.
 * @param {{ open: boolean, title: string, message: string, confirmLabel: string, danger?: boolean, onConfirm: () => Promise<void>, onClose: () => void }} props
 */
export default function ConfirmModal({ open, title, message, confirmLabel, danger = false, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose} width={440}>
      <ConfirmBody message={message} confirmLabel={confirmLabel} danger={danger} onConfirm={onConfirm} onClose={onClose} />
    </Modal>
  );
}