import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { IssuesService } from './issues.service';

// Integration test against the REAL local preview database - see
// src/integration/authorization.integration.spec.ts. Covers the Phase F
// audit fix: a single PATCH changing both status and assignee must record
// BOTH activity entries, not just one (the old if/else-if dropped one).
describe('IssuesService.update - activity logging', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const projects = new ProjectsService(prisma, access);
  const issues = new IssuesService(prisma, access, activity, notifications);

  const runId = Date.now();
  const u: Record<string, string> = {};
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['owner', 'member']) {
      const user = await prisma.user.create({
        data: {
          name: `Activity Test ${label}`,
          email: `activity-${runId}-${label}@b4ftest.local`,
          passwordHash: 'x',
        },
      });
      u[label] = user.id;
    }
    const ws = await workspaces.create(u.owner, {
      name: `Activity Test Workspace ${runId}`,
      slug: `activity-test-${runId}`,
    });
    workspaceId = ws.id;
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: u.member, role: 'MEMBER' },
    });
    const project = await projects.create(workspaceId, u.owner, {
      name: 'Activity Test Project',
      key: `AC${runId.toString().slice(-6)}`,
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  it('records both STATUS_CHANGED and ASSIGNED when a single PATCH changes both', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'Dual-change issue' });
    await issues.update(issue.id, u.owner, { status: 'IN_PROGRESS', assigneeId: u.member });

    const entries = await activity.listForIssue(issue.id);
    expect(entries.some((e) => e.action === 'STATUS_CHANGED')).toBe(true);
    expect(entries.some((e) => e.action === 'ASSIGNED')).toBe(true);
  });

  it('still records a single ISSUE_UPDATED when neither status nor assignee changes', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'Title-only change' });
    await issues.update(issue.id, u.owner, { title: 'Renamed' });

    const entries = await activity.listForIssue(issue.id);
    const relevant = entries.filter((e) => e.action !== 'ISSUE_CREATED');
    expect(relevant).toHaveLength(1);
    expect(relevant[0].action).toBe('ISSUE_UPDATED');
  });
});
