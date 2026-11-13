import * as authApi from '@/lib/api/auth';
import * as commentsApi from '@/lib/api/comments';
import * as issuesApi from '@/lib/api/issues';
import * as workspacesApi from '@/lib/api/workspaces';
import { orNotFound } from '@/lib/api/client';
import { requireSessionToken } from '@/lib/session';
import { ActivityFeed } from '@/components/issue/ActivityFeed';
import { CommentForm } from '@/components/issue/CommentForm';
import { CommentList } from '@/components/issue/CommentList';
import { IssueEditPanel } from '@/components/issue/IssueEditPanel';
import { Avatar } from '@/components/ui/Avatar';

export default async function IssueDetailPage(
  props: {
    params: Promise<{ workspaceId: string; projectId: string; issueId: string }>;
  }
) {
  const params = await props.params;
  const token = await requireSessionToken();
  const basePath = `/workspaces/${params.workspaceId}/projects/${params.projectId}`;

  const [issue, comments, activity, members, workspace, me] = await Promise.all([
    orNotFound(issuesApi.getIssue(token, params.issueId)),
    commentsApi.listComments(token, params.issueId),
    issuesApi.listIssueActivity(token, params.issueId),
    workspacesApi.listMembers(token, params.workspaceId),
    workspacesApi.getWorkspace(token, params.workspaceId),
    authApi.me(token),
  ]);

  const isAdminOrOwner = workspace.myRole === 'OWNER' || workspace.myRole === 'ADMIN';
  const canMutate = isAdminOrOwner || issue.assigneeId === me.id || issue.reporterId === me.id;
  const revalidateBasePath = `${basePath}/issues/${issue.id}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <p className="text-xs text-gray-400">{issue.key}</p>
        <h1 className="text-xl font-semibold">{issue.title}</h1>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            Reporter: {issue.reporter ? <Avatar name={issue.reporter.name} /> : '—'}{' '}
            {issue.reporter?.name}
          </span>
        </div>
      </div>

      <IssueEditPanel
        issue={issue}
        members={members}
        canMutate={canMutate}
        workspaceId={params.workspaceId}
        revalidateBasePath={revalidateBasePath}
        boardPath={`${basePath}/board`}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Comments</h2>
        <CommentList
          comments={comments}
          myUserId={me.id}
          canModerate={isAdminOrOwner}
          revalidateBasePath={revalidateBasePath}
        />
        <div className="mt-3">
          <CommentForm
            issueId={issue.id}
            workspaceId={params.workspaceId}
            revalidateBasePath={revalidateBasePath}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Activity</h2>
        <ActivityFeed entries={activity} />
      </section>
    </div>
  );
}
