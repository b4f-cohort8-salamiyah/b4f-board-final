'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Single shared active-route helper, reused by the project tab bar and the
// workspace sidebar - previously each rolled its own pathname check. Base
// classes give every nav link a consistent, deliberate focus-visible ring
// (never removing the browser's own indicator, just styling it) regardless
// of which active/inactive classes the caller supplies.
const BASE = 'rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-950';

export function NavLink({
  href,
  exact = true,
  activeClassName,
  inactiveClassName,
  onClick,
  children,
}: {
  href: string;
  // Exact match for a single route (e.g. the Board tab); prefix match for a
  // section that owns nested routes (e.g. a sidebar item leading to
  // sub-pages).
  exact?: boolean;
  activeClassName: string;
  inactiveClassName: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`${BASE} ${isActive ? activeClassName : inactiveClassName}`}
    >
      {children}
    </Link>
  );
}
