export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '380819757900-614glch1gpuqsofl1paaae42c4ahta5f.apps.googleusercontent.com';

const AUTH_STORAGE_KEY = 'kamooy_instructor_auth';

export function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.token || !data.user) return null;

    // Check expiration if available
    const decoded = decodeJwt(data.token);
    if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
      clearAuth();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function saveAuth(token, user) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user, savedAt: Date.now() }));
  } catch (e) {
    console.error('Failed to save auth to localStorage:', e);
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear auth from localStorage:', e);
  }
}

export function getAuthToken() {
  const auth = getStoredAuth();
  return auth?.token || null;
}
