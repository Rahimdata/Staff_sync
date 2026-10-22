import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle, Briefcase, Check, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../utils/roles';
import BrandMark from '../components/BrandMark';
import Loader from '../components/Loader';

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'HR', label: 'HR' },
];

/** Self-service signup: Name, Email, Password and Role. Sends the person back to sign in afterwards. */
export default function Register() {
  const { user, initializing } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (initializing) return <Loader fullscreen label="Checking your session" />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (form.password.length < 8) return 'The password needs at least 8 characters.';
    if (form.password.length > 72) return 'The password can be at most 72 characters.';
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
    try {
      await api.post('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const brand = (
    <div className="login__mobile-brand">
      <BrandMark size={28} />
      <span>StaffSync</span>
    </div>
  );

  if (done) {
    return (
      <main className="login__panel auth-solo">
        {brand}
        <div className="login-card auth-done">
          <span className="empty-state__icon">
            <Check size={22} />
          </span>
          <h1>Account created</h1>
          <p className="login-card__sub">Your account is ready. Sign in with your email and password.</p>
          <Link className="btn btn--primary btn--block" to="/login">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="login__panel auth-solo">
      {brand}
      <div className="login-card">
        <h1>Create your account</h1>
        <p className="login-card__sub">Fill in your details to get started with StaffSync.</p>

        {error && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="regName">
              Name
            </label>
            <div className="input-wrap">
              <User size={17} className="input-icon" />
              <input
                id="regName"
                className="input"
                autoComplete="name"
                placeholder="Enter your name"
                value={form.name}
                onChange={set('name')}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="regEmail">
              Email
            </label>
            <div className="input-wrap">
              <Mail size={17} className="input-icon" />
              <input
                id="regEmail"
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={set('email')}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="regPassword">
              Password
            </label>
            <div className="input-wrap">
              <Lock size={17} className="input-icon" />
              <input
                id="regPassword"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={set('password')}
                disabled={submitting}
              />
              <button
                type="button"
                className="input-wrap__action"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <span className="field__count">At least 8 characters</span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="regRole">
              Role
            </label>
            <div className="input-wrap">
              <Briefcase size={17} className="input-icon" />
              <select
                id="regRole"
                className="input"
                value={form.role}
                onChange={set('role')}
                disabled={submitting}
                style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 40, cursor: 'pointer' }}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                aria-hidden="true"
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Creating account
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="login-card__foot">
          Already have an account?{' '}
          <Link to="/login" className="text-link">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}