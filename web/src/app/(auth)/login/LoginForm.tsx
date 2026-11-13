'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, type FormState } from '@/lib/actions/auth';
import { FormError, SubmitButton } from '@/components/ui/FormParts';

const initialState: FormState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className="field-input" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
        />
      </label>
      <SubmitButton>Log in</SubmitButton>
      <p className="text-sm text-gray-500">
        New here?{' '}
        <Link href="/register" className="text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
