import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import Modal from './Modal';

function TrainingForm({ team, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [companyWide, setCompanyWide] = useState(false);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!title.trim()) return setError('Give the program a title.');
    if (!companyWide && selected.length === 0) return setError('Select at least one person, or open it to the whole company.');

    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/training', {
        title: title.trim(),
        description: description.trim() || undefined,
        assignedEmployees: selected,
        isCompanyWide: companyWide,
      });
      onCreated(data.training);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the program. Try again.'));
      setSubmitting(false);
    }
    return undefined;
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
        <label className="field__label" htmlFor="trainingTitle">
          Title
        </label>
        <input id="trainingTitle" className="input input--plain" maxLength={150} placeholder="e.g. Workplace safety basics" value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} autoFocus />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="trainingDescription">
          Description <span className="muted">(optional)</span>
        </label>
        <textarea id="trainingDescription" className="input input--plain input--area" rows={3} maxLength={2000} placeholder="What will people learn, and when?" value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
      </div>

      <div className="field">
        <span className="field__label">Who is it for?</span>
        <label className="check check--toggle">
          <input type="checkbox" checked={companyWide} onChange={(e) => setCompanyWide(e.target.checked)} disabled={submitting} />
          <span>
            Open to the whole company
            <small>Everyone can see this program</small>
          </span>
        </label>

        {team.length === 0 ? (
          <p className="muted">You have no direct reports yet, so only a company-wide program is possible.</p>
        ) : (
          <div className="check-list" role="group" aria-label="Team members">
            {team.map((member) => (
              <label key={member._id} className="check">
                <input type="checkbox" checked={selected.includes(member._id)} onChange={() => toggle(member._id)} disabled={submitting} />
                <span>
                  {member.name}
                  <small>{member.designation || member.department || member.email}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={17} className="spin" />
              Creating
            </>
          ) : (
            'Create program'
          )}
        </button>
      </div>
    </form>
  );
}

/** @param {{ open: boolean, onClose: () => void, team: object[], onCreated: (training: object) => void }} props */
export default function TrainingModal({ open, onClose, team, onCreated }) {
  return (
    <Modal open={open} title="New training program" onClose={onClose} width={520}>
      <TrainingForm team={team} onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}