import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import Modal from './Modal';

const STATUS_OPTIONS = [
  ['PLANNED', 'Planned'],
  ['ONGOING', 'Ongoing'],
  ['COMPLETED', 'Completed'],
];

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

function TrainingForm({ training, team, onClose, onCreated, onUpdated }) {
  const editing = !!training;
  const initialIds = (training?.assignedEmployees ?? []).map(idOf);

  const [title, setTitle] = useState(training?.title ?? '');
  const [description, setDescription] = useState(training?.description ?? '');
  const [status, setStatus] = useState(training?.status ?? 'PLANNED');
  const [companyWide, setCompanyWide] = useState(!!training?.isCompanyWide);
  const [selected, setSelected] = useState(initialIds);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      setError('Give the program a title.');
      return;
    }
    if (!companyWide && selected.length === 0) {
      setError('Select at least one person, or open it to the whole company.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        // Send only what changed.
        const changes = {};
        if (title.trim() !== training.title) changes.title = title.trim();
        if (description.trim() !== (training.description ?? '')) changes.description = description.trim();
        if (status !== training.status) changes.status = status;
        if (companyWide !== !!training.isCompanyWide) changes.isCompanyWide = companyWide;
        const sameAudience = selected.length === initialIds.length && selected.every((id) => initialIds.includes(id));
        if (!sameAudience) changes.assignedEmployees = selected;

        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        const { data } = await api.put(`/training/${training._id}`, changes);
        if (onUpdated) onUpdated(data.training);
      } else {
        const { data } = await api.post('/training', {
          title: title.trim(),
          description: description.trim() || undefined,
          assignedEmployees: selected,
          isCompanyWide: companyWide,
        });
        if (onCreated) onCreated(data.training);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the program. Try again.'));
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

      {editing && (
        <div className="field">
          <label className="field__label" htmlFor="trainingStatus">
            Status
          </label>
          <select id="trainingStatus" className="input input--plain" value={status} onChange={(e) => setStatus(e.target.value)} disabled={submitting}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

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
          <p className="muted">There is nobody to assign yet, so only a company-wide program is possible.</p>
        ) : (
          <div className="check-list" role="group" aria-label="People">
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
              Saving
            </>
          ) : editing ? (
            'Save changes'
          ) : (
            'Create program'
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * Create (training = null) or edit a training program.
 * `team` is who can be assigned: direct reports for managers, everyone for HR.
 * @param {{ open: boolean, training?: object|null, team: object[], onClose: () => void, onCreated?: (t: object) => void, onUpdated?: (t: object) => void }} props
 */
export default function TrainingModal({ open, training = null, team, onClose, onCreated, onUpdated }) {
  return (
    <Modal open={open} title={training ? 'Edit training program' : 'New training program'} onClose={onClose} width={520}>
      <TrainingForm training={training} team={team} onClose={onClose} onCreated={onCreated} onUpdated={onUpdated} />
    </Modal>
  );
}