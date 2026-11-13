import 'server-only';
import type { CurrentUser } from '../types';
import { apiFetch } from './client';

export function login(email: string, password: string) {
  return apiFetch<{ accessToken: string; user: CurrentUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function register(name: string, email: string, password: string) {
  return apiFetch<CurrentUser>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function me(token: string) {
  return apiFetch<CurrentUser>('/auth/me', { token });
}
