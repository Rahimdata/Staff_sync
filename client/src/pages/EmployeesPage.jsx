import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, KeyRound, Pencil, Search, UserCheck, UserPlus, UserX } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import RoleBadge from '../components/RoleBadge';
import ConfirmModal from '../components/ConfirmModal';
import ResetPasswordModal from '../components/ResetPasswordModal';
import EmployeeFormModal from '../components/EmployeeFormModal';

const PAGE_SIZE = 10;

export default function EmployeesPage() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formState, setFormState] = useState(null); // { employee: object | null }
  const [confirmUser, setConfirmUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Wait for a pause in typing before querying.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/users', { params: { q: debouncedSearch || undefined, role: role || undefined, status, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        if (cancelled) return;
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load employees.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, role, status, page, reloadKey]);

  // Managers for the "Reports to" dropdown.
  useEffect(() => {
    api
      .get('/users', { params: { role: 'MANAGER', limit: 100 } })
      .then(({ data }) => setManagers(data.users))
      .catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const handleSaved = (saved, mode) => {
    setNotice(mode === 'create' ? `Added ${saved.name}.` : `Saved changes to ${saved.name}.`);
    reload();
  };

  const deactivate = async () => {
    await api.delete(`/users/${confirmUser._id}`);
    setNotice(`${confirmUser.name} was deactivated. Their records are kept.`);
    reload();
  };

  const reactivate = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: true });
      setNotice(`${u.name} can sign in again.`);
      reload();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reactivate this account.'));
    }
  };

  return (
    <div className="page">
      <header className="page-head page-head--row">
        <div>
          <h2>Employees</h2>
          <p>Add people, assign managers and control who can sign in.</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--primary" onClick={() => setFormState({ employee: null })}>
            <UserPlus size={17} />
            Add employee
          </button>
        </div>
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
          <div className="search">
            <Search size={16} />
            <input className="input" type="search" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search employees" />
          </div>
          <select
            className="input input--plain input--select"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="HR">HR admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
          <select
            className="input input--plain input--select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
            <option value="all">Everyone</option>
          </select>
        </div>

        <div className="panel__body">
          {loading ? (
            <Loader label="Loading employees" />
          ) : users.length === 0 ? (
            <p className="muted empty-line">No one matches these filters.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Reports to</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const active = u.isActive !== false;
                    const isMe = u._id === me._id;
                    return (
                      <tr key={u._id} className={active ? '' : 'row-inactive'}>
                        <td>
                          <strong>{u.name}</strong>
                          <span className="muted clamp">{u.email}</span>
                        </td>
                        <td>
                          <RoleBadge role={u.role} />
                        </td>
                        <td>
                          {u.department || '–'}
                          <span className="muted clamp">{u.designation || ''}</span>
                        </td>
                        <td>{u.managerId?.name ?? '–'}</td>
                        <td>
                          <span className={`status-badge status-badge--${active ? 'approved' : 'neutral'}`}>{active ? 'Active' : 'Deactivated'}</span>
                        </td>
                        <td>
                          <div className="icon-actions">
                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setFormState({ employee: u })} aria-label={`Edit ${u.name}`}>
                              <Pencil size={15} />
                              Edit
                            </button>
                            {!isMe && (
                              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setResetUser(u)} aria-label={`Reset password for ${u.name}`}>
                                <KeyRound size={15} />
                                Password
                              </button>
                            )}
                            {active ? (
                              <button type="button" className="btn btn--sm btn--reject" onClick={() => setConfirmUser(u)} disabled={isMe} title={isMe ? 'You can’t deactivate yourself' : undefined} aria-label={`Deactivate ${u.name}`}>
                                <UserX size={15} />
                                Deactivate
                              </button>
                            ) : (
                              <button type="button" className="btn btn--sm btn--ghost" onClick={() => reactivate(u)} aria-label={`Reactivate ${u.name}`}>
                                <UserCheck size={15} />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="pagination">
              <span>
                {total} {total === 1 ? 'person' : 'people'}, page {page} of {pages}
              </span>
              <div className="pagination__buttons">
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page">
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= pages} aria-label="Next page">
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <EmployeeFormModal open={!!formState} employee={formState?.employee ?? null} managers={managers} currentUserId={me._id} onClose={() => setFormState(null)} onSaved={handleSaved} />

      <ConfirmModal
        open={!!confirmUser}
        title="Deactivate this account?"
        message={confirmUser ? `${confirmUser.name} will no longer be able to sign in, and any open session ends immediately. Their attendance and leave history is kept, and you can reactivate them later.` : ''}
        confirmLabel="Deactivate"
        danger
        onConfirm={deactivate}
        onClose={() => setConfirmUser(null)}
      />

      <ResetPasswordModal open={!!resetUser} employee={resetUser} onClose={() => setResetUser(null)} onDone={(name) => setNotice(`Password reset for ${name}. They were signed out everywhere.`)} />
    </div>
  );
}