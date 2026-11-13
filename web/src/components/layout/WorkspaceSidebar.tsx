'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Project, Workspace } from '@/lib/types';
import { NavLink } from './NavLink';
import { RoleBadge } from '../ui/Badge';

const ACTIVE = 'block bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300';
const INACTIVE = 'block text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';
const LINK_CLASS = 'px-3 py-1.5 text-sm';

// Responsive per specification/FRONTEND-ARCHITECTURE.md, "Tailwind / design
// system": collapses to a drawer below the md breakpoint instead of always
// occupying a fixed 224px column on a phone-width screen.
export function WorkspaceSidebar({
  workspace,
  projects,
}: {
  workspace: Workspace;
  projects: Project[];
}) {
  const base = `/workspaces/${workspace.id}`;
  const [open, setOpen] = useState(false);

  const content = (
    <>
      <div>
        <Link href="/workspaces" className="text-xs text-gray-500 hover:underline">
          ← All workspaces
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="truncate font-semibold">{workspace.name}</h2>
          <RoleBadge role={workspace.myRole} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <NavLink
          href={base}
          activeClassName={`${LINK_CLASS} ${ACTIVE}`}
          inactiveClassName={`${LINK_CLASS} ${INACTIVE}`}
          onClick={() => setOpen(false)}
        >
          Overview
        </NavLink>
        <NavLink
          href={`${base}/settings`}
          activeClassName={`${LINK_CLASS} ${ACTIVE}`}
          inactiveClassName={`${LINK_CLASS} ${INACTIVE}`}
          onClick={() => setOpen(false)}
        >
          Members
        </NavLink>
      </div>

      <div>
        <p className="mb-1 px-3 text-xs font-semibold uppercase text-gray-400">Projects</p>
        <div className="flex flex-col gap-1">
          {projects.map((p) => {
            const href = `${base}/projects/${p.id}`;
            return (
              <NavLink
                key={p.id}
                href={href}
                exact={false}
                activeClassName={`${LINK_CLASS} ${ACTIVE}`}
                inactiveClassName={`${LINK_CLASS} ${INACTIVE}`}
                onClick={() => setOpen(false)}
              >
                {p.name} <span className="text-gray-400">{p.key}</span>
              </NavLink>
            );
          })}
          {projects.length === 0 && (
            <p className="px-3 text-xs text-gray-400">No projects yet.</p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: a slim bar with a toggle, sidebar content becomes an overlay drawer. */}
      <div className="flex w-full items-center justify-between border-b border-gray-200 p-3 dark:border-gray-800 md:hidden">
        <span className="truncate text-sm font-semibold">{workspace.name}</span>
        <button
          type="button"
          className="btn-secondary"
          aria-label="Toggle workspace menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)}>
          <nav
            className="flex h-full w-64 flex-col gap-4 bg-white p-4 dark:bg-gray-950"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </nav>
        </div>
      )}

      {/* Desktop: a normal static column. */}
      <nav className="hidden w-56 flex-shrink-0 flex-col gap-4 border-r border-gray-200 p-4 dark:border-gray-800 md:flex">
        {content}
      </nav>
    </>
  );
}
