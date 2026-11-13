import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/context/ToastContext';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { CreateSprintForm } from './CreateSprintForm';

// Regression coverage for the toast-replay bug this pass fixed (see
// UI-SCREENS.md's "Toast firing, corrected" note). The old implementation
// fired toast.success() from a useEffect watching useActionState's `state`
// - this test exercises the CURRENT implementation (a direct action call,
// toasted on its own resolution) and proves the three properties that
// matter: exactly one toast per real submission, no replay on an unrelated
// re-render, and no success toast on a failed submission.
vi.mock('@/lib/actions/sprints', () => ({
  createSprintAction: vi.fn(),
}));

import { createSprintAction } from '@/lib/actions/sprints';

function renderForm() {
  return render(
    <ToastProvider>
      <CreateSprintForm projectId="11111111-1111-1111-1111-111111111111" revalidateBasePath="/x" />
      <ToastViewport />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(createSprintAction).mockReset();
});

describe('CreateSprintForm toast behavior', () => {
  it('shows the success toast exactly once per real submission', async () => {
    vi.mocked(createSprintAction).mockResolvedValue({});
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Sprint 1'), { target: { value: 'Sprint A' } });
    fireEvent.click(screen.getByRole('button', { name: /create sprint/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Sprint created.')).toHaveLength(1);
    });
    expect(createSprintAction).toHaveBeenCalledTimes(1);
  });

  it('does not replay the toast on a later re-render with no new submission', async () => {
    vi.mocked(createSprintAction).mockResolvedValue({});
    const { rerender } = renderForm();

    fireEvent.change(screen.getByPlaceholderText('Sprint 1'), { target: { value: 'Sprint B' } });
    fireEvent.click(screen.getByRole('button', { name: /create sprint/i }));
    await waitFor(() => expect(screen.getAllByText('Sprint created.')).toHaveLength(1));

    // Simulate exactly the scenario the old useActionState+useEffect
    // pattern got wrong: this component's fiber re-renders (as it would
    // when Next's client-side Router Cache resurrects it on navigating
    // back to this page) with no new form submission in between.
    rerender(
      <ToastProvider>
        <CreateSprintForm
          projectId="11111111-1111-1111-1111-111111111111"
          revalidateBasePath="/x"
        />
        <ToastViewport />
      </ToastProvider>,
    );

    // Still exactly one toast, and the action still only called once - a
    // mere re-render triggered nothing.
    expect(createSprintAction).toHaveBeenCalledTimes(1);
  });

  it('shows the inline error and no success toast when the action fails', async () => {
    // The native required attribute on the name field would otherwise block
    // submission entirely in jsdom before the action ever runs - filling it
    // in simulates a server-side-only rejection (e.g. a duplicate name)
    // that client-side HTML validation can't catch.
    vi.mocked(createSprintAction).mockResolvedValue({ error: 'That sprint name is taken.' });
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Sprint 1'), { target: { value: 'Sprint E' } });
    fireEvent.click(screen.getByRole('button', { name: /create sprint/i }));

    await waitFor(() => {
      expect(screen.getByText('That sprint name is taken.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sprint created.')).not.toBeInTheDocument();
  });

  it('shows a fresh single toast for a second, distinct real submission', async () => {
    vi.mocked(createSprintAction).mockResolvedValue({});
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Sprint 1'), { target: { value: 'Sprint C' } });
    fireEvent.click(screen.getByRole('button', { name: /create sprint/i }));
    await waitFor(() => expect(createSprintAction).toHaveBeenCalledTimes(1));
    // Wait for the button to finish its first pending cycle and revert to
    // its real label before clicking it again, same as a real user would.
    await screen.findByRole('button', { name: /create sprint/i });

    fireEvent.change(screen.getByPlaceholderText('Sprint 1'), { target: { value: 'Sprint D' } });
    fireEvent.click(screen.getByRole('button', { name: /create sprint/i }));

    await waitFor(() => {
      expect(createSprintAction).toHaveBeenCalledTimes(2);
      expect(screen.getAllByText('Sprint created.')).toHaveLength(2);
    });
  });
});
