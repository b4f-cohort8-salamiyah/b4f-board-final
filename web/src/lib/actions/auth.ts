'use server';

import { redirect } from 'next/navigation';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { clearSessionToken, setSessionToken } from '../session';

export interface FormState {
  error?: string;
}

// Web-adapter only: reads the form, forwards to Nest, stores the
// Nest-issued token in the HttpOnly cookie. No authorization/domain
// decisions happen here - Nest already made them. See
// ../../../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md,
// "Web session architecture".
export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const { accessToken } = await authApi.login(email, password);
    await setSessionToken(accessToken);
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: 'Invalid email or password.' };
    }
    return { error: 'Something went wrong. Please try again.' };
  }

  redirect('/dashboard');
}

export async function registerAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!name || !email || !password) {
    return { error: 'Name, email, and password are required.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  try {
    await authApi.register(name, email, password);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 409) {
      return { error: 'An account with that email already exists.' };
    }
    return { error: 'Something went wrong. Please try again.' };
  }

  redirect('/login');
}

export async function logoutAction() {
  await clearSessionToken();
  redirect('/login');
}
