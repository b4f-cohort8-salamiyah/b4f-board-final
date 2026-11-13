import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { clearSessionToken } from '../session';
import type { ApiErrorShape } from '../types';

// Server-only typed Nest API client. This is the *only* place that talks to
// the Nest API - see
// ../../../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md,
// "Web session architecture". Server Components call these functions
// directly during render; Server Actions call them too, for mutations.
// Client Components never import this file.

const NEST_API_URL = process.env.NEST_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: ApiErrorShape,
  ) {
    super(Array.isArray(body.message) ? body.message.join(', ') : body.message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path, NEST_API_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, query } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : undefined;

  if (!response.ok) {
    // A previously-authenticated request (we sent a token) that Nest now
    // rejects as unauthenticated means the session is stale/expired/
    // invalid - Nest is the authentication authority and just made that
    // call, not us. Send the user back to login rather than letting this
    // surface as a generic error boundary. This intentionally does NOT
    // apply to /auth/login itself (called without a token) - a 401 there
    // means "wrong credentials", handled inline by the login form, never
    // a redirect loop back to the page it's already on. See
    // specification/FRONTEND-ARCHITECTURE.md, "Web session architecture".
    if (response.status === 401 && token) {
      try {
        // Only actually allowed in a Server Action / Route Handler
        // context - during a Server Component's render, Next forbids
        // mutating cookies. Swallow that specific failure and redirect
        // anyway; the stale cookie is harmless on the public /login route
        // and gets overwritten the next time the user logs in.
        await clearSessionToken();
      } catch {
        // Expected when called during render - see comment above.
      }
      redirect('/login');
    }
    throw new ApiError(response.status, payload as ApiErrorShape);
  }

  return payload as T;
}

// Turns a Nest 404 into Next's real not-found UI - an unknown or
// inaccessible workspace/project/issue behaves identically (see
// specification/UI-SCREENS.md, "404 / not-found"). Any other error is
// rethrown as-is for the route's error boundary to handle.
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      notFound();
    }
    throw err;
  }
}
