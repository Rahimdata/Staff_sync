import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarCheck,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { roleHome } from '../utils/roles';
import BrandMark from '../components/BrandMark';
import Loader from '../components/Loader';

const VALUE_PROPS = [
  {
    icon: Clock,
    title: 'Attendance in one tap',
    text: 'Employees check in and out. Managers see their team’s day without a spreadsheet.',
  },
  {
    icon: CalendarCheck,
    title: 'Leave decided in minutes',
    text: 'Requests go to the right manager, and overlapping dates are caught before they are filed.',
  },
  {
    icon: Megaphone,
    title: 'Announcements people see',
    text: 'HR posts once. Everyone who signs in sees it.',
  },
];

const FEATURE_BADGES = ['Role-based access', 'Records kept after offboarding', 'Overlap-safe leave'];

export default function Login() {
  const { user, initializing, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Wait for the saved-session check, then skip this page if already signed in.
  if (initializing) return <Loader fullscreen label="Checking your session" />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const signedIn = await login(cleanEmail, password);
      const returnTo = location.state?.from?.pathname;
      navigate(returnTo && returnTo !== '/login' ? returnTo : roleHome(signedIn.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      {/* ───── Brand side ───── */}
      <section className="login__brand" aria-label="About StaffSync">
        <div className="login__brand-top">
          <BrandMark size={34} />
          <span className="login__wordmark">StaffSync</span>
        </div>

        <div className="login__brand-body">
          <h2 className="login__headline">Run attendance, leave and announcements from one place.</h2>
          <p className="login__lede">StaffSync keeps HR, managers and employees looking at the same record.</p>

          <ul className="value-list">
            {VALUE_PROPS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="value-list__item">
                <span className="value-list__icon">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Decorative preview of real product moments */}
          <div className="glass-stack" aria-hidden="true">
            <div className="glass glass--a">
              <span className="glass__avatar">PE</span>
              <div className="glass__body">
                <strong>Priya checked in</strong>
                <span>09:02 AM</span>
              </div>
              <span className="live-dot" />
            </div>
            <div className="glass glass--b">
              <span className="glass__icon">
                <CalendarCheck size={16} />
              </span>
              <div className="glass__body">
                <strong>Leave approved</strong>
                <span>Oct 28 to Oct 29, casual</span>
              </div>
              <span className="status-badge status-badge--approved">Approved</span>
            </div>
          </div>
        </div>

        <ul className="chip-row">
          {FEATURE_BADGES.map((label) => (
            <li key={label} className="chip">
              <ShieldCheck size={14} />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* ───── Form side ───── */}
      <main className="login__panel">
        <div className="login__mobile-brand">
          <BrandMark size={28} />
          <span>StaffSync</span>
        </div>

        <div className="login-card">
          <h1>Sign in to StaffSync</h1>
          <p className="login-card__sub">Use the email and password your HR administrator gave you.</p>

          {error && (
            <div className="alert alert--error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="email">
                Email
              </label>
              <div className="input-wrap">
                <Mail size={17} className="input-icon" />
                <input
                  id="email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={submitting}
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Password
              </label>
              <div className="input-wrap">
                <Lock size={17} className="input-icon" />
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
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
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="login-card__foot">Accounts are created by HR. If you can’t sign in, ask your HR administrator.</p>
        </div>
      </main>
    </div>
  );
}