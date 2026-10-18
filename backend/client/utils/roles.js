/** @typedef {'HR' | 'MANAGER' | 'EMPLOYEE'} Role */

export const ROLES = Object.freeze({ HR: 'HR', MANAGER: 'MANAGER', EMPLOYEE: 'EMPLOYEE' });

export const ROLE_LABELS = Object.freeze({
  HR: 'HR admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
});

/** Landing page for each role after sign-in. */
export const ROLE_HOME = Object.freeze({
  HR: '/hr',
  MANAGER: '/manager',
  EMPLOYEE: '/employee',
});

/** @param {Role} role */
export const roleHome = (role) => ROLE_HOME[role] || '/login';

/** "Priya Employee" -> "PE" */
export const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';