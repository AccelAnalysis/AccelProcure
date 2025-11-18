import httpClient, { getAuthToken, setAuthToken, clearAuthToken } from './httpClient';

const AUTH_BASE = '/auth';
let currentUser = null;
const authListeners = new Set();
let inFlightProfilePromise = null;

const notifyAuthListeners = () => {
  authListeners.forEach((listener) => {
    try {
      listener(currentUser);
    } catch (error) {
      console.error('Auth listener error', error);
    }
  });
};

const persistSession = (payload = {}) => {
  if (payload?.token) {
    setAuthToken(payload.token);
  }
  currentUser = payload?.user ?? null;
  notifyAuthListeners();
  return { user: currentUser, token: payload?.token ?? getAuthToken() };
};

export const clearSession = () => {
  currentUser = null;
  clearAuthToken();
  notifyAuthListeners();
};

export const signIn = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const payload = await httpClient.post(`${AUTH_BASE}/login`, { email, password }, { auth: false });
  return persistSession(payload);
};

export const signUp = async (email, password, profile = {}) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const payload = await httpClient.post(
    `${AUTH_BASE}/register`,
    { email, password, ...profile },
    { auth: false }
  );

  return persistSession(payload);
};

export const signOut = async () => {
  try {
    await httpClient.post(`${AUTH_BASE}/logout`);
  } catch (error) {
    console.warn('Logout request failed, clearing session locally', error);
  } finally {
    clearSession();
  }
};

export const getCurrentUser = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && currentUser) {
    return { user: currentUser, error: null };
  }

  if (!getAuthToken()) {
    return { user: null, error: null };
  }

  if (!inFlightProfilePromise) {
    inFlightProfilePromise = httpClient
      .get(`${AUTH_BASE}/me`)
      .then((user) => {
        currentUser = user;
        notifyAuthListeners();
        return user;
      })
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        inFlightProfilePromise = null;
      });
  }

  try {
    const user = await inFlightProfilePromise;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const resetPassword = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }
  return httpClient.post(`${AUTH_BASE}/password/reset`, { email }, { auth: false });
};

export const updatePassword = async (newPassword) => {
  if (!newPassword) {
    throw new Error('New password is required');
  }
  return httpClient.post(`${AUTH_BASE}/password/update`, { password: newPassword });
};

export const isAuthenticated = () => Boolean(currentUser || getAuthToken());

export const onAuthStateChanged = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }

  authListeners.add(callback);
  callback(currentUser);
  return () => {
    authListeners.delete(callback);
  };
};

export const authService = {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  resetPassword,
  updatePassword,
  onAuthStateChanged,
  isAuthenticated,
  clearSession,
  get token() {
    return getAuthToken();
  }
};

export default authService;
