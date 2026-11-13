import type { Metadata } from 'next';
import * as authApi from '@/lib/api/auth';
import { getSessionToken } from '@/lib/session';
import { StoreProvider } from '@/store/StoreProvider';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ToastViewport } from '@/components/ui/ToastViewport';
import type { CurrentUser } from '@/lib/types';
import './globals.css';

export const metadata: Metadata = {
  title: 'B4F Board',
  description: 'Instructor-only final preview of the B4F Board project-management app.',
};

async function loadCurrentUser(): Promise<CurrentUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await authApi.me(token);
  } catch {
    // Expired/invalid token - treat as logged out rather than erroring the whole app.
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await loadCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <StoreProvider initialUser={currentUser}>{children}</StoreProvider>
            <ToastViewport />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
