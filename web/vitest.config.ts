import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Minimal component-level test runner, deliberately separate from Next's
// own build/lint - covers exactly the toast-firing logic the notification/
// integrity pass changed (one-shot, no stale replay, correct success/error
// mapping on direct Server Action calls). See
// src/components/sprint/CreateSprintForm.test.tsx and
// src/components/issue/CommentForm.test.tsx.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
});
