import { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import api, { getErrorMessage, tokenStore } from '../services/api';
import { formatDate } from '../utils/format';
import { getInitials } from '../utils/roles';
import Loader from '../components/Loader';
import RoleBadge from '../components/RoleBadge';

function ChangePasswordForm() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const validate = () => {
    if (!form.current || !form.next || !form.confirm) return 'Fill in all three fields.';
    if (form.next.length < 8) return 'The new password needs at least 8 characters.';
    if (form.next.length > 72) return 'The new password can be at most 72 characters.';
    if (form.next === form.current) return 'Choose a password different from your current one.';
    if (form.next !== form.confirm) return 'The new passwords don’t match.';
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
    setSuccess('');
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword: form.current, newPassword: form.next });
      // The server invalidates the old token, so keep the fresh one it returns.
      tokenStore.set(data.token);
      setForm({ current: '', next: '', confirm: '' });
      setSuccess('Password updated. Any other devices will need to sign in again.');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change your password. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert--success" role="status">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor="pwCurrent">
          Current password
        </label>
        <input id="pwCurrent" type={type} className="input input--plain" value={form.current} onChange={set('current')} autoComplete="current-password" disabled={submitting} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="pwNew">
          New password
        </label>
        <input id="pwNew" type={type} className="input input--plain" value={form.next} onChange={set('next')} autoComplete="new-password" disabled={submitting} />
        <span className="field__count">At least 8 characters</span>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="pwConfirm">
          Confirm new password
        </label>
        <input id="pwConfirm" type={type} className="input input--plain" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" disabled={submitting} />
      </div>

      <label className="check check--plain">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        <span>Show passwords</span>
      </label>

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={17} className="spin" />
            Updating
          </>
        ) : (
          'Update password'
        )}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');

  // Fetch fresh so "Reports to" shows the manager's name.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!cancelled) setMe(data.user);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your profile.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <h2>My profile</h2>
        <p>Your details, and the password you sign in with.</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid-two">
        <section className="panel">
          {!me ? (
            <div className="panel__body">
              <Loader label="Loading profile" />
            </div>
          ) : (
            <>
              <div className="profile-hero">
                <span className="avatar avatar--lg" aria-hidden="true">
                  {getInitials(me.name)}
                </span>
                <div>
                  <h2>{me.name}</h2>
                  <RoleBadge role={me.role} />
                </div>
              </div>
              <dl className="details">
                <div>
                  <dt>Email</dt>
                  <dd>{me.email}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{me.department || '–'}</dd>
                </div>
                <div>
                  <dt>Designation</dt>
                  <dd>{me.designation || '–'}</dd>
                </div>
                <div>
                  <dt>Reports to</dt>
                  <dd>{me.managerId?.name ?? 'No one'}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{me.dateOfJoining ? formatDate(me.dateOfJoining) : '–'}</dd>
                </div>
              </dl>
              <p className="muted details__note">To change these details, ask your HR administrator.</p>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Change password</h2>
          </div>
          <div className="panel__body">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </div>
  );
}