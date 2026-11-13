'use client';

import { useEffect, useRef, useState } from 'react';
import { searchUsersAction } from '@/lib/actions/users';
import type { UserSearchResult } from '@/lib/types';
import { Avatar } from './Avatar';

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_MS = 250;
// Matches an @-mention being typed right at the cursor, e.g. "...cc @dan" -
// captures the partial name so far. Requires a word boundary or start of
// text before the @, so an email-like "foo@bar" never triggers it.
const TRAILING_MENTION_RE = /(?:^|\s)@(\w{0,30})$/;

// A plain <textarea> with inline @mention autocomplete - deliberately not a
// rich-text editor (see api/src/common/mentions.util.ts). Reuses the same
// workspace-scoped searchUsersAction as UserPicker; selecting a result
// inserts the same `@[Name](id)` token the backend parses.
export function MentionTextarea({
  name,
  workspaceId,
  defaultValue = '',
  placeholder,
  rows = 3,
  required = false,
  className = 'field-input',
}: {
  name: string;
  workspaceId: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (query === null || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      // membersOnly=true - a mention can only ever target an existing
      // workspace member (see api/src/common/mentions.util.ts and
      // requireAllMembersForMention), so the search must look FOR members,
      // not exclude them (that's the add-member picker's own, opposite
      // need - see UserPicker.tsx).
      const state = await searchUsersAction(query, workspaceId, true);
      if (cancelled) return;
      setLoading(false);
      setResults(state.results ?? []);
      setActiveIndex(0);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, workspaceId]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    setValue(text);

    const match = TRAILING_MENTION_RE.exec(text.slice(0, cursor));
    if (match) {
      setMentionStart(cursor - match[1].length - 1);
      setQuery(match[1]);
    } else {
      setMentionStart(null);
      setQuery(null);
    }
  }

  function selectUser(user: UserSearchResult) {
    if (mentionStart === null || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const token = `@[${user.name}](${user.id}) `;
    const newValue = `${before}${token}${after}`;
    setValue(newValue);
    setQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const pos = before.length + token.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectUser(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setQuery(null);
      setMentionStart(null);
    }
  }

  const showDropdown = query !== null;

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div className="card absolute z-10 mt-1 max-h-48 w-72 overflow-y-auto p-1 shadow-lg">
          {loading && <p className="px-3 py-2 text-sm text-gray-400">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No matching members.</p>
          )}
          {!loading &&
            results.map((user, i) => (
              <button
                key={user.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                  i === activeIndex
                    ? 'bg-blue-50 dark:bg-blue-950'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectUser(user)}
              >
                <Avatar name={user.name} />
                <span className="min-w-0 flex-1 truncate">{user.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
