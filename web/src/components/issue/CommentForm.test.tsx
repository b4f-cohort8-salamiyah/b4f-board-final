import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/context/ToastContext';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { CommentForm } from './CommentForm';

// Regression coverage for the second concrete toast-replay repro this pass
// fixed ("navigating to .../issues/[id] showed 'Comment added.' only upon
// arrival") - same reasoning as CreateSprintForm.test.tsx.
vi.mock('@/lib/actions/comments', () => ({
  createCommentAction: vi.fn(),
}));
// MentionTextarea (used inside CommentForm) calls this on an "@" keystroke;
// mocked here purely so importing it never pulls in the real Server
// Action's `server-only` import chain (next/headers etc.) into jsdom - no
// test below ever types "@", so it's never actually invoked.
vi.mock('@/lib/actions/users', () => ({
  searchUsersAction: vi.fn().mockResolvedValue({ results: [] }),
}));

import { createCommentAction } from '@/lib/actions/comments';

function renderForm() {
  return render(
    <ToastProvider>
      <CommentForm
        issueId="11111111-1111-1111-1111-111111111111"
        workspaceId="22222222-2222-2222-2222-222222222222"
        revalidateBasePath="/x"
      />
      <ToastViewport />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(createCommentAction).mockReset();
});

describe('CommentForm toast behavior', () => {
  it('shows the success toast exactly once per real submission', async () => {
    vi.mocked(createCommentAction).mockResolvedValue({});
    renderForm();

    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
      target: { value: 'Looks good' },
    });
    fireEvent.click(screen.getByRole('button', { name: /comment/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Comment added.')).toHaveLength(1);
    });
    expect(createCommentAction).toHaveBeenCalledTimes(1);
  });

  it('does not replay the toast on a later re-render with no new submission', async () => {
    vi.mocked(createCommentAction).mockResolvedValue({});
    const { rerender } = renderForm();

    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
      target: { value: 'First comment' },
    });
    fireEvent.click(screen.getByRole('button', { name: /comment/i }));
    await waitFor(() => expect(screen.getAllByText('Comment added.')).toHaveLength(1));

    // Same "fiber resurrected by the Router Cache, no new submission"
    // scenario as CreateSprintForm.test.tsx.
    rerender(
      <ToastProvider>
        <CommentForm
          issueId="11111111-1111-1111-1111-111111111111"
          workspaceId="22222222-2222-2222-2222-222222222222"
          revalidateBasePath="/x"
        />
        <ToastViewport />
      </ToastProvider>,
    );

    expect(createCommentAction).toHaveBeenCalledTimes(1);
  });

  it('shows the inline error and no success toast when the action fails', async () => {
    // The native required attribute on the textarea would otherwise block
    // submission entirely in jsdom before the action ever runs - filling it
    // in simulates a server-side-only rejection the client can't catch.
    vi.mocked(createCommentAction).mockResolvedValue({ error: 'Could not post the comment.' });
    renderForm();

    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), {
      target: { value: 'Something' },
    });
    fireEvent.click(screen.getByRole('button', { name: /comment/i }));

    await waitFor(() => {
      expect(screen.getByText('Could not post the comment.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Comment added.')).not.toBeInTheDocument();
  });
});
