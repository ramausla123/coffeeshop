import { apiUrl } from './api';
import type { AuthUser, UserRole } from '../types';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('coffee_auth_token');
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('coffee_auth_token', token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('coffee_auth_token');
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getRoleFromToken(token: string): UserRole | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = JSON.parse(window.atob(padded));
    return decoded.role || null;
  } catch {
    return null;
  }
}

export async function fetchProfile(): Promise<AuthUser> {
  const res = await fetch(apiUrl('/auth/profile'), {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error('Invalid session');
  }

  return res.json();
}
