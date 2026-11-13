'use client';

import { useRef } from 'react';
import { Modal } from './Modal';

// Reusable destructive-action confirmation, built on the shared Modal (Escape
// support, focus trap, focus restoration come from there - see Modal.tsx).
// Default focus sits on Cancel, never on Confirm, so a stray Enter/click
// can't accidentally run the destructive action - see the Phase A audit (§5).
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel} initialFocusRef={cancelRef}>
      <div className="flex flex-col gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">{description}</div>
        <div className="flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
