'use server';

import * as usersApi from '../api/users';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import { safeRevalidate } from './validation';

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function updateProfileAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = await requireSessionToken();
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const confirmPassword = String(formData.get('confirmPassword') ?? '').trim();
  const currentPassword = String(formData.get('currentPassword') ?? '').trim();

  const dto: { name?: string; password?: string; currentPassword?: string } = {};
  if (name) dto.name = name;
  if (password) {
    if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
    // Mirrors the client-side check in ProfileForm - defense in depth, since
    // a form can always be submitted without JavaScript running.
    if (password !== confirmPassword) {
      return { error: 'New password and confirmation do not match.' };
    }
    if (!currentPassword) return { error: 'Enter your current password to set a new one.' };
    dto.password = password;
    dto.currentPassword = currentPassword;
  }

  try {
    await usersApi.updateMe(token, dto);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not update your profile.' };
  }

  safeRevalidate('/profile');
  return { success: true };
}
