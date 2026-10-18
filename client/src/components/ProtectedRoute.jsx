import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, roleHome } from '../utils/roles';
import Loader from './Loader';

function AccessDenied({ role }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <ShieldAlert size={22} />
      </span>
      <h2>You don't have access to this page</h2>
      <p>The {ROLE_LABELS[role]} role can't open this area. Ask your HR admin if you need access.</p>
      <Link className="btn btn--ghost" to={roleHome(role)}>
        Back to your dashboard
      </Link>
    </div>
  );
}

/**
 * Route guard.
 *  - Not signed in      -> redirect to /login (remembers where you were going)
 *  - Wrong role         -> "no access" panel
 *  - Otherwise          -> renders children, or nested routes through <Outlet />
 *
 * Usage as a layout route:
 *   <Route element={<ProtectedRoute allowedRoles={['HR']} />}> ...child routes... </Route>
 *
 * NOTE: this only hides screens. Real enforcement is the backend `authorize()` middleware.
 *
 * @param {{ allowedRoles?: Array<'HR'|'MANAGER'|'EMPLOYEE'>, children?: import('react').ReactNode }} props
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Loader fullscreen label="Restoring your session" />;

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (allowedRoles && !allowedRoles.includes(user.role)) return <AccessDenied role={user.role} />;

  return children ?? <Outlet />;
}