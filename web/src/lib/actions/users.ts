'use server';

import * as usersApi from '../api/users';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import type { UserSearchResult } from '../types';
import { assertUuid } from './validation';

export interface SearchState {
  results?: UserSearchResult[];
  error?: string;
}

// UserPicker (a Client Component) can't call lib/api directly - that module
// is server-only and holds the Bearer token, per
// specification/FRONTEND-ARCHITECTURE.md's "Web session architecture". This
// is the one Server Action it goes through instead, same pattern as every
// other mutation/query a Client Component needs.
export async function searchUsersAction(
  q: string,
  workspaceId?: string,
  // false/unset (add-member picker): exclude existing members - nothing to
  // "add" if they're already there. true (@mentions): the opposite - you
  // can only mention someone who IS already a member (the backend rejects
  // mentioning a non-member). See UsersService.search() for the bug this
  // fixed: both callers previously shared the exclude-members behavior,
  // which made a real member invisible to mention search.
  membersOnly = false,
): Promise<SearchState> {
  const query = q.trim();
  if (query.length < 2) return { results: [] };
  if (workspaceId) assertUuid(workspaceId, 'workspaceId');

  const token = await requireSessionToken();
  try {
    const results = await usersApi.searchUsers(token, query, workspaceId, membersOnly);
    return { results };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Search failed. Try again.' };
  }
}
