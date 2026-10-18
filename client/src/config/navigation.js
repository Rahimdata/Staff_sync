import {
  CalendarCheck,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Users,
} from 'lucide-react';

const dashboard = (to) => ({ to, label: 'Dashboard', icon: LayoutDashboard });
const attendance = { to: '/attendance', label: 'Attendance', icon: Clock };
const announcements = { to: '/announcements', label: 'Announcements', icon: Megaphone };
const training = { to: '/training', label: 'Training', icon: GraduationCap };

/** Sidebar links per role. Order here is the order on screen. */
export const NAV_BY_ROLE = {
  HR: [
    dashboard('/hr'),
    { to: '/employees', label: 'Employees', icon: Users },
    attendance,
    { to: '/leaves', label: 'Leave requests', icon: CalendarCheck },
    announcements,
    training,
  ],
  MANAGER: [
    dashboard('/manager'),
    { to: '/team', label: 'My team', icon: Users },
    attendance,
    { to: '/leaves', label: 'Leave requests', icon: CalendarCheck },
    announcements,
    training,
  ],
  EMPLOYEE: [
    dashboard('/employee'),
    { ...attendance, label: 'My attendance' },
    { to: '/leaves', label: 'My leave', icon: CalendarCheck },
    announcements,
    training,
  ],
};

export const getNavItems = (role) => NAV_BY_ROLE[role] ?? [];

/** Page title shown in the top bar. */
export const getPageTitle = (pathname, role) =>
  getNavItems(role).find((item) => item.to === pathname)?.label ?? 'StaffSync';