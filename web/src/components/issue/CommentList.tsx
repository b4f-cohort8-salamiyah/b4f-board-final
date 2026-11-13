import type { Comment } from '@/lib/types';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/States';
import { MentionText } from '../ui/MentionText';
import { DeleteCommentButton } from './DeleteCommentButton';

export function CommentList({
  comments,
  myUserId,
  canModerate,
  revalidateBasePath,
}: {
  comments: Comment[];
  myUserId: string;
  canModerate: boolean;
  revalidateBasePath: string;
}) {
  if (comments.length === 0) {
    return <EmptyState title="No comments yet." hint="Be the first to say something." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <Avatar name={c.author?.name ?? 'Deleted user'} />
          <div className="min-w-0 flex-1 rounded-md bg-gray-50 p-3 dark:bg-gray-900">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{c.author?.name ?? 'Deleted user'}</p>
              <div className="flex items-center gap-2">
                <time className="text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleString()}
                </time>
                {(canModerate || c.authorId === myUserId) && (
                  <DeleteCommentButton
                    commentId={c.id}
                    revalidateBasePath={revalidateBasePath}
                  />
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">
              <MentionText text={c.body} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
