import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { SprintsService } from '../sprints/sprints.service';
import { IssuesService } from './issues.service';

// Integration test against the REAL local preview database - see
// src/integration/authorization.integration.spec.ts. Covers the
// UX-correction-pass workflow fixes: an issue exists independently of any
// sprint (Backlog is the default, never a precondition for creation), an
// issue can be created directly into a given sprint, moved between sprints/
// Backlog freely (subject to the existing rules), and a PLANNED sprint's
// detail is readable by any member, not just Admin/Owner.
describe('Issue/Backlog/Sprint workflow', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const projects = new ProjectsService(prisma, access);
  const sprints = new SprintsService(prisma, access, notifications);
  const issues = new IssuesService(prisma, access, activity, notifications);

  const runId = Date.now();
  const u: Record<string, string> = {};
  let workspaceId: string;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['owner', 'reporter', 'assignee', 'unrelated']) {
      const user = await prisma.user.create({
        data: {
          name: `Workflow Test ${label}`,
          email: `workflow-${runId}-${label}@b4ftest.local`,
          passwordHash: 'x',
        },
      });
      u[label] = user.id;
    }

    const ws = await workspaces.create(u.owner, {
      name: `Workflow Test Workspace ${runId}`,
      slug: `workflow-test-${runId}`,
    });
    workspaceId = ws.id;
    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId, userId: u.reporter, role: WorkspaceRole.MEMBER },
        { workspaceId, userId: u.assignee, role: WorkspaceRole.MEMBER },
        { workspaceId, userId: u.unrelated, role: WorkspaceRole.MEMBER },
      ],
    });

    const project = await projects.create(workspaceId, u.owner, {
      name: 'Workflow Test Project',
      key: `WF${runId.toString().slice(-6)}`,
    });
    projectId = project.id;

    const otherProject = await projects.create(workspaceId, u.owner, {
      name: 'Other Project',
      key: `WO${runId.toString().slice(-6)}`,
    });
    otherProjectId = otherProject.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  it('creates an issue with no sprint at all (the default Backlog case) - never requires one', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'Backlog by default' });
    expect(issue.sprintId).toBeNull();
  });

  it('creates an issue directly into a given sprint when one is explicitly passed', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Workflow Sprint A' });
    const issue = await issues.create(projectId, u.owner, {
      title: 'Created into a sprint',
      sprintId: sprint.id,
    });
    expect(issue.sprintId).toBe(sprint.id);
  });

  it('rejects creating an issue directly into a sprint from a different project', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Workflow Sprint B' });
    await expect(
      issues.create(otherProjectId, u.owner, { title: 'Wrong project', sprintId: sprint.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves an existing Backlog issue into a sprint created after the issue already existed', async () => {
    const issue = await issues.create(projectId, u.owner, {
      title: 'Created before any sprint',
    });
    expect(issue.sprintId).toBeNull();

    const laterSprint = await sprints.create(projectId, u.owner, { name: 'Created later' });
    const moved = await issues.update(issue.id, u.owner, { sprintId: laterSprint.id });
    expect(moved.sprintId).toBe(laterSprint.id);
  });

  it('moves an issue back to the Backlog from a sprint', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Workflow Sprint C' });
    const issue = await issues.create(projectId, u.owner, {
      title: 'Round trip',
      sprintId: sprint.id,
    });
    const backToBacklog = await issues.update(issue.id, u.owner, { sprintId: null });
    expect(backToBacklog.sprintId).toBeNull();
  });

  it('moves an issue directly from one sprint to another', async () => {
    const sprintA = await sprints.create(projectId, u.owner, { name: 'Workflow Sprint D' });
    const sprintB = await sprints.create(projectId, u.owner, { name: 'Workflow Sprint E' });
    const issue = await issues.create(projectId, u.owner, {
      title: 'Sprint to sprint',
      sprintId: sprintA.id,
    });
    const moved = await issues.update(issue.id, u.owner, { sprintId: sprintB.id });
    expect(moved.sprintId).toBe(sprintB.id);
  });

  it('a PLANNED sprint is readable (findOne) by any workspace member, not just Admin/Owner', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Workflow Sprint F' });
    const found = await sprints.findOne(sprint.id, u.unrelated);
    expect(found.id).toBe(sprint.id);
    expect(found.status).toBe('PLANNED');
  });

  describe('description edit permissions', () => {
    let issueId: string;

    beforeAll(async () => {
      const issue = await issues.create(projectId, u.reporter, {
        title: 'Description permission test',
        assigneeId: u.assignee,
      });
      issueId = issue.id;
    });

    it('the reporter can edit the description', async () => {
      await expect(
        issues.update(issueId, u.reporter, { description: 'Written by the reporter' }),
      ).resolves.toMatchObject({ description: 'Written by the reporter' });
    });

    it('the assignee can edit the description', async () => {
      await expect(
        issues.update(issueId, u.assignee, { description: 'Written by the assignee' }),
      ).resolves.toMatchObject({ description: 'Written by the assignee' });
    });

    it('an unrelated member (neither reporter nor assignee nor Admin/Owner) cannot edit the description', async () => {
      await expect(
        issues.update(issueId, u.unrelated, { description: 'Should be blocked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
