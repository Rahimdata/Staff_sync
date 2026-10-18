import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler, tokenStore } from '../services/api';

/**
 * @typedef {Object} AuthUser
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {'HR'|'MANAGER'|'EMPLOYEE'} role
 * @property {string} [department]
 * @property {string} [designation]
 * @property {string|null} [managerId]
 */

const AuthContext = createContext(null);

/**
 * Reads the `exp` claim so we can skip a doomed network call on page load.
 * This is a convenience only: the server is always the authority on validity.
 */
const isTokenExpired = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64));
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true; // malformed token
  }
};

export function AuthProvider({ children }) {
  /** @type {[AuthUser|null, Function]} */
  const [user, setUser] = useState(null);
  // True until we know whether a saved session is still valid. Routes wait on this.
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // If any API call comes back 401, drop the session.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Restore the session on page load. The token only carries the user id, so the
  // role always comes from the server (/auth/me), never from client-side decoding.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = tokenStore.get();
      if (!token || isTokenExpired(token)) {
        tokenStore.clear();
        setInitializing(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) setUser(data.user);
      } catch {
        // 401 is handled by the interceptor. Network errors keep the token so a reload can retry.
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Signs in and stores the token. Throws the Axios error so the caller can show its message.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<AuthUser>}
   */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  /** True when the signed-in user has one of the given roles. */
  const hasRole = useCallback((...roles) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(
    () => ({ user, initializing, isAuthenticated: !!user, login, logout, hasRole }),
    [user, initializing, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}