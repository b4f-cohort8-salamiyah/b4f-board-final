'use client';

import { useState } from 'react';
import { createCommentAction } from '@/lib/actions/comments';
import { MentionTextarea } from '../ui/MentionTextarea';
import { FormError, SubmitButton } from '../ui/FormParts';
import { useToast } from '@/context/ToastContext';

// Toast-replay bug fix (same root cause and fix as CreateSprintForm): the
// previous useActionState + useEffect([state]) pattern could re-fire a
// success toast when Next's client-side Router Cache resurrected this
// component's fiber on a later, unrelated visit to this page, because the
// restored `state` reference looked "new" to the effect even though it
// represented an old success. Calling the action directly and toasting on
// its resolution removes the possibility entirely - nothing persists for a
// later render to replay.
export function CommentForm({
  issueId,
  workspaceId,
  revalidateBasePath,
}: {
  issueId: string;
  workspaceId: string;
  revalidateBasePath: string;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  // MentionTextarea is a controlled component - a native form reset can't
  // clear it (React would just re-render its own state back over the DOM).
  // Changing its key forces a fresh mount with an empty value instead.
  const [resetKey, setResetKey] = useState(0);
  const toast = useToast();

  async function action(formData: FormData) {
    setError(undefined);
    setPending(true);
    const result = await createCommentAction(issueId, revalidateBasePath, {}, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setResetKey((k) => k + 1);
    toast.success('Comment added.');
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <FormError message={error} />
      <MentionTextarea
        key={resetKey}
        name="body"
        workspaceId={workspaceId}
        required
        rows={2}
        placeholder="Add a comment… (type @ to mention someone)"
      />
      <SubmitButton className="btn-primary w-fit" disabled={pending}>
        Comment
      </SubmitButton>
    </form>
  );
}
