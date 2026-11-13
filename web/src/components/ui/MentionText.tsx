// Renders `@[Display Name](userId)` tokens (see
// api/src/common/mentions.util.ts for why this plain-text format was chosen
// over a rich-text document) as a distinct, non-link pill instead of the
// raw markup. The userId is intentionally unused here - the embedded name
// is what's shown; see MENTION_RE for why the id is the stable reference
// even though this renderer doesn't need to resolve it itself.
const MENTION_RE = /@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi;

export function MentionText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={key++}
        className="rounded bg-blue-50 px-1 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      >
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
