import { ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { IssuesService } from '../issues/issues.service';
import { UsersService } from '../users/users.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

// Integration tests against the REAL local preview database (see
// api/README.md, "Local database setup") - authorization here genuinely
// crosses Workspace/Project/Issue/User relations, which a mocked Prisma
// client would not exercise honestly. See
// specification/FINAL-PREVIEW-ACCEPTANCE.md for what these prove.
//
// Every fixture uses a run-unique suffix so this suite never collides with
// the seeded demo data (`npm run seed`) or a previous test run, and cleans
// up everything it creates in afterAll.
describe('Authorization (integration)', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const projects = new ProjectsService(prisma, access);
  const issues = new IssuesService(prisma, access, activity, notifications);
  const users = new UsersService(prisma, access);

  const runId = Date.now();
  const email = (label: string) => `test-${runId}-${label}@b4ftest.local`;

  let workspaceId: string;
  let projectId: string;
  const u: Record<string, string> = {};

  async function createUser(label: string) {
    const user = await prisma.user.create({
      data: { name: `Test ${label}`, email: email(label), passwordHash: 'x' },
    });
    u[label] = user.id;
  }

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of [
      'owner',
      'admin',
      'admin2',
      'member',
      'reporter',
      'unrelated',
      'toRemove',
      'former',
    ]) {
      await createUser(label);
    }

    const ws = await workspaces.create(u.owner, {
      name: `Auth Test Workspace ${runId}`,
      slug: `auth-test-${runId}`,
    });
    workspaceId = ws.id;

    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId, userId: u.admin, role: WorkspaceRole.ADMIN },
        { workspaceId, userId: u.admin2, role: WorkspaceRole.ADMIN },
        { workspaceId, userId: u.member, role: WorkspaceRole.MEMBER },
        { workspaceId, userId: u.reporter, role: WorkspaceRole.MEMBER },
        { workspaceId, userId: u.unrelated, role: WorkspaceRole.MEMBER },
        { workspaceId, userId: u.toRemove, role: WorkspaceRole.MEMBER },
        { workspaceId, userId: u.former, role: WorkspaceRole.MEMBER },
      ],
    });

    const project = await projects.create(workspaceId, u.owner, {
      name: 'Auth Test Project',
      key: `AT${runId.toString().slice(-6)}`,
    });
    projectId = project.id;
  });

  afterAll(async () => {
    // Cascades to members/projects/issues/comments/activity - see schema.
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  describe('Issue ownership-based mutation rule', () => {
    let issueId: string;

    beforeAll(async () => {
      const issue = await issues.create(projectId, u.reporter, {
        title: 'Ownership test issue',
        assigneeId: u.member,
      });
      issueId = issue.id;
    });

    it('an unrelated workspace member cannot mutate the issue', async () => {
      await expect(
        issues.update(issueId, u.unrelated, { title: 'hijacked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('the assignee can mutate the issue', async () => {
      await expect(
        issues.update(issueId, u.member, { title: 'updated by assignee' }),
      ).resolves.toMatchObject({ title: 'updated by assignee' });
    });

    it('the reporter can mutate the issue', async () => {
      await expect(
        issues.update(issueId, u.reporter, { title: 'updated by reporter' }),
      ).resolves.toMatchObject({ title: 'updated by reporter' });
    });

    it('an Admin can mutate the issue despite not being assignee/reporter', async () => {
      await expect(
        issues.update(issueId, u.admin, { title: 'updated by admin' }),
      ).resolves.toMatchObject({ title: 'updated by admin' });
    });

    it('the Owner can mutate the issue despite not being assignee/reporter', async () => {
      await expect(
        issues.update(issueId, u.owner, { title: 'updated by owner' }),
      ).resolves.toMatchObject({ title: 'updated by owner' });
    });
  });

  describe('/users/me/issues excludes issues from workspaces the user has left', () => {
    let issueId: string;

    beforeAll(async () => {
      const issue = await issues.create(projectId, u.owner, {
        title: 'Former-member dashboard leak test issue',
        assigneeId: u.former,
      });
      issueId = issue.id;
    });

    it('appears while the assignee is still a member', async () => {
      const mine = await users.myIssues(u.former);
      expect(mine.map((i) => i.id)).toContain(issueId);
    });

    it('disappears once the assignee is removed from the workspace', async () => {
      await workspaces.removeMember(workspaceId, u.owner, u.former);
      const mine = await users.myIssues(u.former);
      expect(mine.map((i) => i.id)).not.toContain(issueId);
    });

    it('the issue itself remains 404 for the removed user (not merely hidden from the dashboard)', async () => {
      await expect(issues.findOne(issueId, u.former)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('Project creation is role-gated', () => {
    it('a Member cannot create a project', async () => {
      await expect(
        projects.create(workspaceId, u.member, {
          name: 'Nope',
          key: `NO${runId.toString().slice(-4)}`,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('an Admin can create a project', async () => {
      await expect(
        projects.create(workspaceId, u.admin, {
          name: 'Admin Project',
          key: `AD${runId.toString().slice(-4)}`,
        }),
      ).resolves.toMatchObject({ name: 'Admin Project' });
    });
  });

  describe('Role changes are Owner-only, member removal is Owner/Admin', () => {
    it('an Admin cannot change another member’s role', async () => {
      await expect(
        workspaces.updateMemberRole(workspaceId, u.admin, u.member, { role: 'ADMIN' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('an Admin can remove a Member', async () => {
      await expect(
        workspaces.removeMember(workspaceId, u.admin, u.toRemove),
      ).resolves.toMatchObject({ removed: true });
    });

    it('an Admin cannot remove another Admin', async () => {
      await expect(
        workspaces.removeMember(workspaceId, u.admin, u.admin2),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
