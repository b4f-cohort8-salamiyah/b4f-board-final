'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Context's one job in B4F Board - see
// ../../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md.
// Small, shared UI config, nothing domain-related.
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'b4f-board-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Per-viewer convenience only, wrapped defensively - see the workspace's
    // browser-storage guidance. Never anything that must persist reliably.
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(stored ?? (prefersDark ? 'dark' : 'light'));
    } catch {
      // ignore - default theme stands
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
