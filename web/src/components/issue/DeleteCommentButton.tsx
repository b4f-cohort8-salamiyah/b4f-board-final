'use client';

import { useState, useTransition } from 'react';
import { deleteCommentAction } from '@/lib/actions/comments';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

export function DeleteCommentButton({
  commentId,
  revalidateBasePath,
}: {
  commentId: string;
  revalidateBasePath: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteCommentAction(commentId, revalidateBasePath);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Comment deleted.');
      setConfirming(false);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
      <ConfirmDialog
        open={confirming}
        title="Delete comment"
        description="Delete this comment permanently? This can't be undone."
        confirmLabel="Delete"
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
