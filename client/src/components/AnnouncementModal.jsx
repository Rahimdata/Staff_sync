import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import Modal from './Modal';

const MAX_TITLE = 150;
const MAX_CONTENT = 5000;

function AnnouncementForm({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!title.trim() || !content.trim()) {
      setError('Add a title and a message.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/announcements', { title: title.trim(), content: content.trim() });
      onCreated(data.announcement);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not post the announcement. Try again.'));
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

      <div className="field">
        <label className="field__label" htmlFor="annTitle">
          Title
        </label>
        <input id="annTitle" className="input input--plain" maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} autoFocus />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="annContent">
          Message
        </label>
        <textarea id="annContent" className="input input--plain input--area" rows={6} maxLength={MAX_CONTENT} value={content} onChange={(e) => setContent(e.target.value)} disabled={submitting} />
        <span className="field__count">
          {content.length}/{MAX_CONTENT}
        </span>
      </div>

      <p className="muted form-note">Everyone who signs in will see this.</p>

      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={17} className="spin" />
              Posting
            </>
          ) : (
            'Post announcement'
          )}
        </button>
      </div>
    </form>
  );
}

/** @param {{ open: boolean, onClose: () => void, onCreated: (announcement: object) => void }} props */
export default function AnnouncementModal({ open, onClose, onCreated }) {
  return (
    <Modal open={open} title="Post an announcement" onClose={onClose} width={520}>
      <AnnouncementForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}