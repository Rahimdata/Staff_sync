import { useEffect, useState } from 'react';
import { AlertCircle, Check, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import AnnouncementModal from '../components/AnnouncementModal';

const formatPosted = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isHR = user.role === 'HR';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formState, setFormState] = useState(null); // { announcement: object | null }
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/announcements', { params: { page, limit: 10 } })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data.announcements);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load announcements.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const reload = () => setReloadKey((k) => k + 1);

  const remove = async () => {
    await api.delete(`/announcements/${deleteTarget._id}`);
    setNotice('Announcement deleted.');
    // If that was the last item on this page, step back one page.
    if (items.length === 1 && page > 1) setPage((p) => p - 1);
    else reload();
  };

  return (
    <div className="page">
      <header className="page-head page-head--row">
        <div>
          <h2>Announcements</h2>
          <p>{isHR ? 'Post updates for the whole company.' : 'Updates from HR, newest first.'}</p>
        </div>
        {isHR && (
          <div className="page-head__actions">
            <button type="button" className="btn btn--primary" onClick={() => setFormState({ announcement: null })}>
              <Plus size={17} />
              Post announcement
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

      {loading ? (
        <Loader label="Loading announcements" />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <Megaphone size={22} />
          </span>
          <h2>No announcements yet</h2>
          <p>{isHR ? 'Use “Post announcement” to tell everyone something.' : 'When HR posts an update it will show up here.'}</p>
        </div>
      ) : (
        <div className="stack">
          {items.map((a) => {
            const edited = new Date(a.updatedAt) - new Date(a.createdAt) > 2000;
            return (
              <article key={a._id} className="panel post">
                <div className="post__head">
                  <div>
                    <h3>{a.title}</h3>
                    <p className="post__meta">
                      {a.authorId?.name ?? 'HR'}, {formatPosted(a.createdAt)}
                      {edited ? ' (edited)' : ''}
                    </p>
                  </div>
                  {isHR && (
                    <div className="post__actions">
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => setFormState({ announcement: a })} aria-label={`Edit ${a.title}`}>
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button type="button" className="btn btn--sm btn--reject" onClick={() => setDeleteTarget(a)} aria-label={`Delete ${a.title}`}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p className="post__body">{a.content}</p>
              </article>
            );
          })}
        </div>
      )}

      {!loading && <Pagination page={page} pages={pages} total={total} onPage={setPage} noun="announcements" />}

      <AnnouncementModal
        open={!!formState}
        announcement={formState?.announcement ?? null}
        onClose={() => setFormState(null)}
        onCreated={() => {
          setNotice('Announcement posted.');
          setPage(1);
          reload();
        }}
        onUpdated={() => {
          setNotice('Announcement updated.');
          reload();
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this announcement?"
        message={deleteTarget ? `“${deleteTarget.title}” will disappear for everyone. This can’t be undone.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}