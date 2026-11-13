import * as projectsApi from '@/lib/api/projects';
import * as workspacesApi from '@/lib/api/workspaces';
import { orNotFound } from '@/lib/api/client';
import { requireSessionToken } from '@/lib/session';
import { WorkspaceSidebar } from '@/components/layout/WorkspaceSidebar';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const token = await requireSessionToken();
  // A non-member gets a 404 from Nest here, which surfaces as this route's
  // not-found UI - see specification/API-SPECIFICATION.md's 404-not-403 rule.
  const [workspace, projects] = await Promise.all([
    orNotFound(workspacesApi.getWorkspace(token, workspaceId)),
    projectsApi.listProjects(token, workspaceId),
  ]);

  return (
    // Column on mobile (the sidebar's own mobile bar sits above content, full
    // width) - row on desktop (the sidebar becomes a static side column).
    // See components/layout/WorkspaceSidebar.tsx.
    <div className="flex min-w-0 flex-1 flex-col md:flex-row">
      <WorkspaceSidebar workspace={workspace} projects={projects} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
