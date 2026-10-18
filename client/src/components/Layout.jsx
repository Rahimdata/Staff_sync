import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

/** App shell for every signed-in page: sidebar + top bar + page content. */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="shell__main">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}