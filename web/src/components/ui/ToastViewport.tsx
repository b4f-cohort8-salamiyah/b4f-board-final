'use client';

import type { ToastKind } from '@/context/ToastContext';
import { useToastInternal } from '@/context/ToastContext';

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
};

const KIND_ICON: Record<ToastKind, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

// Fixed overlay, never part of document flow - adding/removing a toast never
// shifts any page content. role="status"/aria-live="polite" for most kinds;
// errors use assertive so screen readers announce them promptly without
// waiting for other speech to finish.
//
// z-index hierarchy (low to high), per the UI consistency pass: inline
// dropdowns (mention/UserPicker, z-10) < navbar dropdown (notification
// bell, z-20) < toast (z-45) < modal (z-50) - a toast always sits above
// every dropdown, but a modal dialog always wins over a toast if both are
// somehow open at once.
export function ToastViewport() {
  const { toasts, dismiss } = useToastInternal();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[45] flex w-full max-w-sm flex-col gap-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${KIND_CLASS[t.kind]}`}
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-current/20 text-xs font-bold"
          >
            {KIND_ICON[t.kind]}
          </span>
          <p className="min-w-0 flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="flex-shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
