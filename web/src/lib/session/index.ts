import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Server-only web-session adapter. Contains no business logic - reading and
// writing one cookie is its entire job. See
// ../../../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md,
// "Web session architecture". The `import 'server-only'` above makes any
// accidental Client Component import of this file fail at build time.
const SESSION_COOKIE = 'session';

// ~8h, matching the Nest access-token lifetime - see
// specification/AUTH-AND-PERMISSIONS.md.
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// "Is there a session at all" is a web-adapter check, not a domain decision
// - real authorization still happens in Nest on every request regardless.
// Server Components and Server Actions call this before doing anything
// authenticated; redirects to /login if there is no session.
export async function requireSessionToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) {
    redirect('/login');
  }
  return token;
}
