import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import Modal from './Modal';

const MAX_TITLE = 150;
const MAX_CONTENT = 5000;

function AnnouncementForm({ announcement, onClose, onCreated, onUpdated }) {
  const editing = !!announcement;
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
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
      if (editing) {
        const changes = {};
        if (title.trim() !== announcement.title) changes.title = title.trim();
        if (content.trim() !== announcement.content) changes.content = content.trim();
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        const { data } = await api.put(`/announcements/${announcement._id}`, changes);
        if (onUpdated) onUpdated(data.announcement);
      } else {
        const { data } = await api.post('/announcements', { title: title.trim(), content: content.trim() });
        if (onCreated) onCreated(data.announcement);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the announcement. Try again.'));
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
              Saving
            </>
          ) : editing ? (
            'Save changes'
          ) : (
            'Post announcement'
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * Post (announcement = null) or edit an announcement.
 * @param {{ open: boolean, announcement?: object|null, onClose: () => void, onCreated?: (a: object) => void, onUpdated?: (a: object) => void }} props
 */
export default function AnnouncementModal({ open, announcement = null, onClose, onCreated, onUpdated }) {
  return (
    <Modal open={open} title={announcement ? 'Edit announcement' : 'Post an announcement'} onClose={onClose} width={520}>
      <AnnouncementForm announcement={announcement} onClose={onClose} onCreated={onCreated} onUpdated={onUpdated} />
    </Modal>
  );
}