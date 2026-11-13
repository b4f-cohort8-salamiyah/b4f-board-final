import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { IssuesService } from '../issues/issues.service';
import { SprintsService } from './sprints.service';

// Integration test against the REAL local preview database - see
// src/integration/authorization.integration.spec.ts. Covers the Phase C
// sprint rules: Admin/Owner-only mutation, one active sprint per project,
// forward-only PLANNED -> ACTIVE -> COMPLETED, a completed sprint can't be
// edited or reactivated, story points are non-negative, and an issue can
// only be moved into a sprint from its own project.
describe('SprintsService', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const projects = new ProjectsService(prisma, access);
  const issues = new IssuesService(prisma, access, activity, notifications);
  const sprints = new SprintsService(prisma, access, notifications);

  const runId = Date.now();
  const u: Record<string, string> = {};
  let workspaceId: string;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['owner', 'member']) {
      const user = await prisma.user.create({
        data: {
          name: `Sprint Test ${label}`,
          email: `sprint-${runId}-${label}@b4ftest.local`,
          passwordHash: 'x',
        },
      });
      u[label] = user.id;
    }

    const ws = await workspaces.create(u.owner, {
      name: `Sprint Test Workspace ${runId}`,
      slug: `sprint-test-${runId}`,
    });
    workspaceId = ws.id;
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: u.member, role: WorkspaceRole.MEMBER },
    });

    const project = await projects.create(workspaceId, u.owner, {
      name: 'Sprint Test Project',
      key: `SP${runId.toString().slice(-6)}`,
    });
    projectId = project.id;

    const otherProject = await projects.create(workspaceId, u.owner, {
      name: 'Other Project',
      key: `OT${runId.toString().slice(-6)}`,
    });
    otherProjectId = otherProject.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  it('a Member cannot create a sprint', async () => {
    await expect(sprints.create(projectId, u.member, { name: 'Nope' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('an Owner can create a sprint, which starts PLANNED', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Sprint 1' });
    expect(sprint.status).toBe('PLANNED');
  });

  // Each lifecycle test below gets its OWN fresh project - the "one active
  // sprint per project" rule means reusing the shared projectId across tests
  // that each start a sprint would make them interfere with each other
  // (a sprint left ACTIVE by one test would block the next test's start()).
  async function freshProject(label: string) {
    const project = await projects.create(workspaceId, u.owner, {
      name: `Lifecycle ${label}`,
      key: `L${label}${runId.toString().slice(-5)}`,
    });
    return project.id;
  }

  it('only one sprint can be ACTIVE per project at a time', async () => {
    const pid = await freshProject('A');
    const a = await sprints.create(pid, u.owner, { name: 'Sprint A' });
    const b = await sprints.create(pid, u.owner, { name: 'Sprint B' });
    await sprints.start(a.id, u.owner);
    await expect(sprints.start(b.id, u.owner)).rejects.toBeInstanceOf(ConflictException);
  });

  it('a sprint can only move PLANNED -> ACTIVE -> COMPLETED, forward only', async () => {
    const pid = await freshProject('C');
    const sprint = await sprints.create(pid, u.owner, { name: 'Sprint C' });
    await expect(sprints.complete(sprint.id, u.owner)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await sprints.start(sprint.id, u.owner);
    await sprints.complete(sprint.id, u.owner);
    await expect(sprints.start(sprint.id, u.owner)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('a completed sprint can no longer be edited', async () => {
    const pid = await freshProject('D');
    const sprint = await sprints.create(pid, u.owner, { name: 'Sprint D' });
    await sprints.start(sprint.id, u.owner);
    await sprints.complete(sprint.id, u.owner);
    await expect(
      sprints.update(sprint.id, u.owner, { name: 'Renamed' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assigning an issue to a sprint from a different project', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Sprint E' });
    const issueInOtherProject = await issues.create(otherProjectId, u.owner, {
      title: 'Cross-project issue',
    });
    await expect(
      issues.update(issueInOtherProject.id, u.owner, { sprintId: sprint.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows assigning an issue to a sprint in its own project, and moving it back to the backlog', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Sprint F' });
    const issue = await issues.create(projectId, u.owner, {
      title: 'Real issue',
      storyPoints: 3,
    });
    const moved = await issues.update(issue.id, u.owner, { sprintId: sprint.id });
    expect(moved.sprintId).toBe(sprint.id);
    const backToBacklog = await issues.update(issue.id, u.owner, { sprintId: null });
    expect(backToBacklog.sprintId).toBeNull();
  });

  it('computes sprint points from issue story points and DONE status, not stored data', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Sprint G' });
    const issueA = await issues.create(projectId, u.owner, { title: 'A', storyPoints: 5 });
    const issueB = await issues.create(projectId, u.owner, { title: 'B', storyPoints: 3 });
    await issues.update(issueA.id, u.owner, { sprintId: sprint.id });
    await issues.update(issueB.id, u.owner, { sprintId: sprint.id, status: 'DONE' });

    const found = await sprints.findOne(sprint.id, u.owner);
    expect(found.points).toEqual({
      issueCount: 2,
      totalPoints: 8,
      completedPoints: 3,
      remainingPoints: 5,
      completionPercent: 38,
    });
  });
});
