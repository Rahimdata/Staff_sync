import axios from 'axios';

const TOKEN_KEY = 'staffsync_token';

/**
 * Thin wrapper around localStorage. Storage can throw (private mode, blocked cookies),
 * so every access is guarded and the app degrades to "logged out" instead of crashing.
 */
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

/** Single Axios instance used by the whole app. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT to every outgoing request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthContext registers a callback here so an expired/revoked token logs the user out cleanly.
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginCall = error.config?.url?.includes('/auth/login');

    // A 401 on any call except login means the session is dead (expired token, deactivated user).
    if (status === 401 && !isLoginCall && tokenStore.get()) {
      tokenStore.clear();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

/**
 * Turns any Axios error into a message that is safe to show a person.
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export const getErrorMessage = (error, fallback = 'Something went wrong. Try again.') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
  if (error?.request) return 'Cannot reach the server. Check that the API is running.';
  return fallback;
};

export default api;