'use client';

import { NavLink } from '@/components/layout/NavLink';

const ACTIVE = 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300';
const INACTIVE =
  'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100';
const LINK_CLASS = 'px-2.5 py-1 text-sm';

export function ProjectNav({ base }: { base: string }) {
  return (
    <nav className="ml-auto flex gap-1 text-sm">
      <NavLink href={base} activeClassName={`${LINK_CLASS} ${ACTIVE}`} inactiveClassName={`${LINK_CLASS} ${INACTIVE}`}>
        Overview
      </NavLink>
      <NavLink
        href={`${base}/board`}
        exact={false}
        activeClassName={`${LINK_CLASS} ${ACTIVE}`}
        inactiveClassName={`${LINK_CLASS} ${INACTIVE}`}
      >
        Board
      </NavLink>
      <NavLink
        href={`${base}/backlog`}
        exact={false}
        activeClassName={`${LINK_CLASS} ${ACTIVE}`}
        inactiveClassName={`${LINK_CLASS} ${INACTIVE}`}
      >
        Backlog
      </NavLink>
    </nav>
  );
}
