import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPageTitle } from '../config/navigation';
import { getInitials } from '../utils/roles';
import RoleBadge from './RoleBadge';

/**
 * Top bar: page title, profile chip (links to your profile), quick sign-out.
 * @param {{ onMenuClick: () => void }} props
 */
export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    // Navigate first so ProtectedRoute doesn't remember this page for the next person to sign in.
    navigate('/login', { replace: true });
    logout();
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-btn topbar__menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <h1 className="topbar__title">{getPageTitle(pathname, user.role)}</h1>

      <div className="topbar__spacer" />

      <Link to="/profile" className="profile-chip" title="My profile">
        <span className="avatar" aria-hidden="true">
          {getInitials(user.name)}
        </span>
        <div className="profile-chip__meta">
          <span className="profile-chip__name">{user.name}</span>
          <RoleBadge role={user.role} />
        </div>
      </Link>

      <button type="button" className="icon-btn" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
        <LogOut size={18} />
      </button>
    </header>
  );
}