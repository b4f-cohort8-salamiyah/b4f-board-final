import Link from 'next/link';
import * as issuesApi from '@/lib/api/issues';
import * as projectsApi from '@/lib/api/projects';
import { requireSessionToken } from '@/lib/session';
import { StatusBadge } from '@/components/ui/Badge';

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;

export default async function ProjectOverviewPage(
  props: {
    params: Promise<{ workspaceId: string; projectId: string }>;
  }
) {
  const params = await props.params;
  const token = await requireSessionToken();
  const [project, issues] = await Promise.all([
    projectsApi.getProject(token, params.projectId),
    issuesApi.listIssues(token, params.projectId),
  ]);

  const counts = STATUSES.map((status) => ({
    status,
    count: issues.filter((i) => i.status === status).length,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {project.description && <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Status summary</h2>
        <div className="flex flex-wrap gap-3">
          {counts.map(({ status, count }) => (
            <div key={status} className="card flex items-center gap-2 px-3 py-2">
              <StatusBadge status={status} />
              <span className="text-sm font-medium">{count}</span>
            </div>
          ))}
        </div>
      </section>

      <Link
        href={`/workspaces/${params.workspaceId}/projects/${params.projectId}/board`}
        className="btn-primary w-fit"
      >
        Open board →
      </Link>
    </div>
  );
}
