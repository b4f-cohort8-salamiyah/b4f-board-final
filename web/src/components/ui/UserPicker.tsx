'use client';

import { useEffect, useRef, useState } from 'react';
import { searchUsersAction } from '@/lib/actions/users';
import type { UserSearchResult } from '@/lib/types';
import { Avatar } from './Avatar';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Reusable debounced user search - built for Add-member first (see
// AddMemberForm), designed to be reused as-is for an assignee picker or
// mentions later (same searchUsersAction, same result shape) without this
// component needing to know about either of those callers yet.
export function UserPicker({
  workspaceId,
  onSelect,
  placeholder = 'Search by name or email…',
  excludeUserIds = [],
}: {
  // Scopes the search to one workspace and excludes its existing members
  // server-side (see api/src/users/users.service.ts, search()). Omit for an
  // unscoped search.
  workspaceId?: string;
  onSelect: (user: UserSearchResult) => void;
  placeholder?: string;
  // Client-side belt-and-braces on top of the server-side workspace
  // exclusion - useful when the caller has its own extra exclusions (e.g.
  // "don't show the current assignee again").
  excludeUserIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    let cancelled = false;
    const handle = setTimeout(async () => {
      const state = await searchUsersAction(query, workspaceId);
      if (cancelled) return;
      setLoading(false);
      if (state.error) {
        setError(state.error);
        setResults([]);
        return;
      }
      setResults((state.results ?? []).filter((u) => !excludeUserIds.includes(u.id)));
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // excludeUserIds is typically a fresh array each render - compare by
    // content, not identity, to avoid re-searching on every keystroke for an
    // unrelated reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, workspaceId, excludeUserIds.join(',')]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  function select(user: UserSearchResult) {
    onSelect(user);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="user-picker-results"
        value={query}
        placeholder={placeholder}
        className="field-input"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <div
          id="user-picker-results"
          role="listbox"
          className="card absolute z-10 mt-1 max-h-64 w-full overflow-y-auto p-1 shadow-lg"
        >
          {loading && <p className="px-3 py-2 text-sm text-gray-400">Searching…</p>}
          {!loading && error && (
            <p className="px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No matching users.</p>
          )}
          {!loading &&
            !error &&
            results.map((user, i) => (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                  i === activeIndex
                    ? 'bg-blue-50 dark:bg-blue-950'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(user)}
              >
                <Avatar name={user.name} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{user.name}</span>{' '}
                  <span className="text-gray-400">{user.email}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
