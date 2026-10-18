import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavItems } from '../config/navigation';
import BrandMark from './BrandMark';

/**
 * Dark, role-aware navigation. Off-canvas drawer below 980px.
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = getNavItems(user.role);

  return (
    <>
      <div className={`sidebar-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar__brand">
          <BrandMark size={30} />
          <span className="sidebar__brand-name">StaffSync</span>
          <button type="button" className="icon-btn icon-btn--dark sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <NavLink to="/profile" className="glass-note glass-note--link" title="My profile">
            <strong>{user.name}</strong>
            <span>{[user.designation, user.department].filter(Boolean).join(', ') || 'No department set'}</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}