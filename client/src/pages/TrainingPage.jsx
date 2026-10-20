import { useEffect, useState } from 'react';
import { AlertCircle, Check, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import TrainingModal from '../components/TrainingModal';

const BADGE = { PLANNED: 'neutral', ONGOING: 'info', COMPLETED: 'approved' };
const LABEL = { PLANNED: 'Planned', ONGOING: 'Ongoing', COMPLETED: 'Completed' };

// "Priya, Ravi and 3 more"
const audienceText = (t, isReviewer) => {
  if (t.isCompanyWide) return 'Whole company';
  if (!isReviewer) return 'Assigned to you';
  const names = (t.assignedEmployees ?? []).map((e) => e.name);
  if (names.length === 0) return 'Nobody yet';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
};

export default function TrainingPage() {
  const { user } = useAuth();
  const isHR = user.role === 'HR';
  const isReviewer = isHR || user.role === 'MANAGER';

  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formState, setFormState] = useState(null); // { training: object | null }
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Who can be assigned: everyone for HR, direct reports for managers.
  useEffect(() => {
    if (!isReviewer) return;
    const request = isHR ? api.get('/users', { params: { limit: 100 } }) : api.get('/users/team');
    request.then(({ data }) => setPeople(data.users)).catch(() => {});
  }, [isReviewer, isHR]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/training', { params: { status: status || undefined, page, limit: 10 } })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data.trainings);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load training programs.'));
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
  // HR can change anything; a manager only the programs they created.
  const canManage = (t) => isHR || (user.role === 'MANAGER' && t.managerId?._id === user._id);

  const remove = async () => {
    await api.delete(`/training/${deleteTarget._id}`);
    setNotice('Training program deleted.');
    if (items.length === 1 && page > 1) setPage((p) => p - 1);
    else reload();
  };

  return (
    <div className="page">
      <header className="page-head page-head--row">
        <div>
          <h2>Training</h2>
          <p>{isReviewer ? 'Create programs and keep their status up to date.' : 'Programs assigned to you and open to everyone.'}</p>
        </div>
        {isReviewer && (
          <div className="page-head__actions">
            <button type="button" className="btn btn--primary" onClick={() => setFormState({ training: null })}>
              <Plus size={17} />
              New program
            </button>
          </div>
        )}
      </header>

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

      <section className="panel">
        <div className="toolbar">
          <select
            className="input input--plain input--select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="panel__body">
          {loading ? (
            <Loader label="Loading training programs" />
          ) : items.length === 0 ? (
            <div className="empty-inline">
              <GraduationCap size={20} />
              <p className="muted">{status ? 'No programs with that status.' : isReviewer ? 'No programs yet. Create the first one.' : 'Nothing is assigned to you yet.'}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>For</th>
                    <th>Status</th>
                    <th>Run by</th>
                    {isReviewer && <th />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <strong>{t.title}</strong>
                        {t.description && (
                          <span className="muted clamp" title={t.description}>
                            {t.description}
                          </span>
                        )}
                      </td>
                      <td>{audienceText(t, isReviewer)}</td>
                      <td>
                        <span className={`status-badge status-badge--${BADGE[t.status] ?? 'neutral'}`}>{LABEL[t.status] ?? t.status}</span>
                      </td>
                      <td>{t.managerId?.name ?? '–'}</td>
                      {isReviewer && (
                        <td>
                          {canManage(t) && (
                            <div className="icon-actions">
                              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setFormState({ training: t })} aria-label={`Edit ${t.title}`}>
                                <Pencil size={15} />
                                Edit
                              </button>
                              <button type="button" className="btn btn--sm btn--reject" onClick={() => setDeleteTarget(t)} aria-label={`Delete ${t.title}`}>
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && <Pagination page={page} pages={pages} total={total} onPage={setPage} noun="programs" />}
        </div>
      </section>

      <TrainingModal
        open={!!formState}
        training={formState?.training ?? null}
        team={people}
        onClose={() => setFormState(null)}
        onCreated={() => {
          setNotice('Training program created.');
          setPage(1);
          reload();
        }}
        onUpdated={() => {
          setNotice('Training program updated.');
          reload();
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this program?"
        message={deleteTarget ? `“${deleteTarget.title}” will be removed for everyone it was shared with. This can’t be undone.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}