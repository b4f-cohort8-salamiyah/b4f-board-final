'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/States';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side log for debugging - never shown raw to the user, see
    // specification/API-SPECIFICATION.md's error-handling section.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <ErrorState message="Something went wrong. Please try again." />
      <button type="button" className="btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
