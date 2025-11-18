import { APP_CONFIG } from '../config/app.config';

const TOKEN_STORAGE_KEY = 'accelrfx.token';
const memoryStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
};

const getStorage = () => {
  if (typeof window !== 'undefined' && window?.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return memoryStorage();
};

const storage = getStorage();

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? 500;
    this.body = body;
  }
}

const sanitizeParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
  );

const buildUrl = (path, params) => {
  const normalizedBase = APP_CONFIG.API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = (path || '').toString().replace(/^\//, '');
  const url = /^https?:/i.test(path)
    ? new URL(path)
    : new URL(`${normalizedBase}/${normalizedPath}`);

  if (params && Object.keys(params).length > 0) {
    const searchParams = sanitizeParams(params);
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
};

export const getAuthToken = () => {
  try {
    return storage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to access storage for auth token', error);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (!token) {
      storage.removeItem(TOKEN_STORAGE_KEY);
      return;
    }
    storage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.warn('Unable to persist auth token', error);
  }
};

export const clearAuthToken = () => {
  try {
    storage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear auth token', error);
  }
};

const parseResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const request = async (method, path, options = {}) => {
  const { data, params, headers = {}, auth = true, signal } = options;
  const url = buildUrl(path, params);
  const requestHeaders = new Headers(headers);

  let body;
  if (data instanceof FormData) {
    body = data;
  } else if (data !== undefined && data !== null) {
    requestHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(data);
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body,
    signal,
    credentials: 'include'
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }
    const message = payload?.message || payload?.error || response.statusText || 'Request failed';
    throw new ApiError(message, { status: response.status, body: payload });
  }

  return payload;
};

const get = (path, options) => request('GET', path, options);
const post = (path, data, options = {}) => request('POST', path, { ...options, data });
const put = (path, data, options = {}) => request('PUT', path, { ...options, data });
const patch = (path, data, options = {}) => request('PATCH', path, { ...options, data });
const del = (path, options) => request('DELETE', path, options);

const httpClient = {
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  TOKEN_STORAGE_KEY,
  ApiError
};

export { request, get, post, put, patch, del as deleteRequest, TOKEN_STORAGE_KEY };
export default httpClient;
