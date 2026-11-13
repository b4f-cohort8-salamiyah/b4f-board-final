'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type FormState } from '@/lib/actions/auth';
import { FormError, SubmitButton } from '@/components/ui/FormParts';

const initialState: FormState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" type="text" required autoComplete="name" className="field-input" />
      </label>
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
          minLength={8}
          autoComplete="new-password"
          className="field-input"
        />
      </label>
      <SubmitButton>Create account</SubmitButton>
      <p className="text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
