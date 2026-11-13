import * as projectsApi from '@/lib/api/projects';
import { orNotFound } from '@/lib/api/client';
import { requireSessionToken } from '@/lib/session';
import { ProjectNav } from './ProjectNav';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await params;
  const token = await requireSessionToken();
  const project = await orNotFound(projectsApi.getProject(token, projectId));
  const base = `/workspaces/${workspaceId}/projects/${projectId}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-4 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <h1 className="font-semibold">{project.name}</h1>
        <span className="text-xs text-gray-400">{project.key}</span>
        <ProjectNav base={base} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
