// Mentions are stored inline in plain text as `@[Display Name](userId)` -
// the stable reference is the UUID, never the display name (see Phase E
// audit, "do not treat display names as canonical references"). This is
// plain text + structured metadata, not a rich-text document - deliberately
// avoids building a rich-text editor for one feature. The embedded name is
// a point-in-time label only, kept so a comment still reads sensibly even
// if the mentioned user is later removed from the workspace; it is never
// used to resolve *who* was mentioned, only the UUID is.
const MENTION_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi;

export function extractMentionedUserIds(text: string | null | undefined): string[] {
  if (!text) return [];
  const ids = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    ids.add(match[2].toLowerCase());
  }
  return [...ids];
}
