import { NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from '../activity/activity.service';
import { ProjectsService } from '../projects/projects.service';
import { IssuesService } from '../issues/issues.service';
import { CommentsService } from '../comments/comments.service';
import { SprintsService } from '../sprints/sprints.service';
import { NotificationsService } from './notifications.service';

// Integration test against the REAL local preview database - same
// convention as sprints.integration.spec.ts and the other *.integration.spec.ts
// files: unique b4ftest.local users per run, full cleanup in afterAll. Covers
// the notification-generation rules (mention, assignment, comment,
// role-change, member-added, sprint lifecycle - never for one's own action)
// and the per-user authorization boundary (a notification has exactly one
// legitimate reader).
describe('NotificationsService', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const projects = new ProjectsService(prisma, access);
  const issues = new IssuesService(prisma, access, activity, notifications);
  const comments = new CommentsService(prisma, access, activity, notifications);
  const sprints = new SprintsService(prisma, access, notifications);

  const runId = Date.now();
  const u: Record<string, string> = {};
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['owner', 'a', 'b', 'c']) {
      const user = await prisma.user.create({
        data: {
          name: `Notif Test ${label}`,
          email: `notif-${runId}-${label}@b4ftest.local`,
          passwordHash: 'x',
        },
      });
      u[label] = user.id;
    }

    const ws = await workspaces.create(u.owner, {
      name: `Notif Test Workspace ${runId}`,
      slug: `notif-test-${runId}`,
    });
    workspaceId = ws.id;
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: u.a, role: WorkspaceRole.MEMBER },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: u.b, role: WorkspaceRole.MEMBER },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: u.c, role: WorkspaceRole.MEMBER },
    });

    const project = await projects.create(workspaceId, u.owner, {
      name: 'Notif Test Project',
      key: `NT${runId.toString().slice(-6)}`,
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  it('mentioning someone in a comment notifies them, never the mentioner', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'Mention target issue' });
    await comments.create(issue.id, u.a, {
      body: `Hey @[Notif Test B](${u.b}) check this out`,
    });

    const bInbox = await notifications.listForUser(u.b, false);
    expect(bInbox.some((n) => n.type === 'MENTION' && n.issueId === issue.id)).toBe(true);

    const aInbox = await notifications.listForUser(u.a, false);
    expect(aInbox.some((n) => n.type === 'MENTION')).toBe(false);
  });

  it('mentioning yourself notifies no one', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'Self-mention issue' });
    const before = await notifications.unreadCount(u.a);
    await comments.create(issue.id, u.a, {
      body: `@[Notif Test A](${u.a}) noting this myself`,
    });
    const after = await notifications.unreadCount(u.a);
    expect(after.count).toBe(before.count);
  });

  it('assigning an issue notifies only the new assignee, never the previous one or the actor', async () => {
    const issue = await issues.create(projectId, u.owner, {
      title: 'Assignment issue',
      assigneeId: u.a,
    });
    const aInboxAfterCreate = await notifications.listForUser(u.a, false);
    expect(
      aInboxAfterCreate.some((n) => n.type === 'ISSUE_ASSIGNED' && n.issueId === issue.id),
    ).toBe(true);

    await issues.update(issue.id, u.owner, { assigneeId: u.b });

    const bInbox = await notifications.listForUser(u.b, false);
    expect(bInbox.some((n) => n.type === 'ISSUE_ASSIGNED' && n.issueId === issue.id)).toBe(
      true,
    );

    // The previous assignee (A) gets no SECOND notification from the
    // reassignment away from them - only the original "assigned to you".
    const aInboxAfterReassign = await notifications.listForUser(u.a, false);
    const aAssignedCount = aInboxAfterReassign.filter(
      (n) => n.type === 'ISSUE_ASSIGNED' && n.issueId === issue.id,
    ).length;
    expect(aAssignedCount).toBe(1);

    const ownerInbox = await notifications.listForUser(u.owner, false);
    expect(ownerInbox.some((n) => n.type === 'ISSUE_ASSIGNED' && n.issueId === issue.id)).toBe(
      false,
    );
  });

  it('self-assigning an issue notifies no one', async () => {
    const before = await notifications.unreadCount(u.owner);
    await issues.create(projectId, u.owner, {
      title: 'Self-assigned issue',
      assigneeId: u.owner,
    });
    const after = await notifications.unreadCount(u.owner);
    expect(after.count).toBe(before.count);
  });

  it('commenting notifies the reporter and current assignee, deduplicated, never the author', async () => {
    const issue = await issues.create(projectId, u.a, {
      title: 'Reporter/assignee issue',
      assigneeId: u.b,
    });
    // Clear B's inbox from the assignment notification above so this test
    // only sees the comment notification it triggers itself.
    await notifications.markAllRead(u.b);

    await comments.create(issue.id, u.c, { body: 'Plain comment, no mentions' });

    const aInbox = await notifications.listForUser(u.a, false);
    expect(
      aInbox.some(
        (n) => n.type === 'COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE' && n.issueId === issue.id,
      ),
    ).toBe(true);

    const bInbox = await notifications.listForUser(u.b, true);
    expect(
      bInbox.filter(
        (n) => n.type === 'COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE' && n.issueId === issue.id,
      ).length,
    ).toBe(1);

    const cInbox = await notifications.listForUser(u.c, false);
    expect(
      cInbox.some(
        (n) => n.type === 'COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE' && n.issueId === issue.id,
      ),
    ).toBe(false);
  });

  it('a comment that both mentions and is on their own issue notifies the reporter exactly once', async () => {
    const issue = await issues.create(projectId, u.a, { title: 'Reporter also mentioned' });
    await notifications.markAllRead(u.a);

    await comments.create(issue.id, u.c, {
      body: `@[Notif Test A](${u.a}) see above`,
    });

    const aInbox = await notifications.listForUser(u.a, true);
    const relevant = aInbox.filter((n) => n.issueId === issue.id);
    expect(relevant.length).toBe(1);
    expect(relevant[0].type).toBe('MENTION');
  });

  it('a workspace role change notifies only the target member, never the actor', async () => {
    await notifications.markAllRead(u.a);
    await workspaces.updateMemberRole(workspaceId, u.owner, u.a, { role: 'ADMIN' });

    const aInbox = await notifications.listForUser(u.a, true);
    expect(aInbox.some((n) => n.type === 'WORKSPACE_ROLE_CHANGED')).toBe(true);

    const ownerInbox = await notifications.listForUser(u.owner, false);
    expect(ownerInbox.some((n) => n.type === 'WORKSPACE_ROLE_CHANGED')).toBe(false);

    // Revert so later tests see the original role.
    await workspaces.updateMemberRole(workspaceId, u.owner, u.a, { role: 'MEMBER' });
  });

  it('adding a member notifies only the newly added member', async () => {
    const extra = await prisma.user.create({
      data: {
        name: 'Notif Test Extra',
        email: `notif-${runId}-extra@b4ftest.local`,
        passwordHash: 'x',
      },
    });
    try {
      await workspaces.addMember(workspaceId, u.owner, { email: extra.email });
      const extraInbox = await notifications.listForUser(extra.id, false);
      expect(extraInbox.some((n) => n.type === 'MEMBER_ADDED')).toBe(true);
      const ownerInbox = await notifications.listForUser(u.owner, false);
      expect(ownerInbox.some((n) => n.type === 'MEMBER_ADDED')).toBe(false);
    } finally {
      await prisma.user.delete({ where: { id: extra.id } });
    }
  });

  it('starting and completing a sprint notifies only members with an issue assigned in it, never the actor', async () => {
    const sprint = await sprints.create(projectId, u.owner, { name: 'Notif Sprint' });
    const assignedIssue = await issues.create(projectId, u.owner, {
      title: 'In the sprint',
      assigneeId: u.b,
      sprintId: sprint.id,
    });
    await issues.create(projectId, u.owner, { title: 'Unrelated backlog issue' });
    await notifications.markAllRead(u.b);

    await sprints.start(sprint.id, u.owner);
    let bInbox = await notifications.listForUser(u.b, true);
    expect(bInbox.some((n) => n.type === 'SPRINT_STARTED' && n.sprintId === sprint.id)).toBe(
      true,
    );

    const aInbox = await notifications.listForUser(u.a, false);
    expect(aInbox.some((n) => n.type === 'SPRINT_STARTED' && n.sprintId === sprint.id)).toBe(
      false,
    );

    await notifications.markAllRead(u.b);
    await sprints.complete(sprint.id, u.owner);
    bInbox = await notifications.listForUser(u.b, true);
    expect(bInbox.some((n) => n.type === 'SPRINT_COMPLETED' && n.sprintId === sprint.id)).toBe(
      true,
    );

    const ownerInbox = await notifications.listForUser(u.owner, false);
    expect(
      ownerInbox.some((n) => n.type === 'SPRINT_COMPLETED' && n.sprintId === sprint.id),
    ).toBe(false);

    void assignedIssue;
  });

  it("markRead only affects the caller's own notification, and is idempotent", async () => {
    const issue = await issues.create(projectId, u.owner, {
      title: 'Mark-read issue',
      assigneeId: u.c,
    });
    const cInbox = await notifications.listForUser(u.c, true);
    const target = cInbox.find((n) => n.issueId === issue.id);
    expect(target).toBeDefined();

    await notifications.markRead(u.c, target!.id);
    const afterRead = await notifications.listForUser(u.c, true);
    expect(afterRead.some((n) => n.id === target!.id)).toBe(false);

    // Marking an already-read notification read again is a no-op, not an error.
    await expect(notifications.markRead(u.c, target!.id)).resolves.toEqual({ marked: true });
  });

  it("a user can never mark or delete another user's notification - it looks identical to not found", async () => {
    const issue = await issues.create(projectId, u.owner, {
      title: 'Cross-user access issue',
      assigneeId: u.a,
    });
    const aInbox = await notifications.listForUser(u.a, true);
    const target = aInbox.find((n) => n.issueId === issue.id);
    expect(target).toBeDefined();

    await expect(notifications.markRead(u.b, target!.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(notifications.remove(u.b, target!.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      notifications.markRead(u.b, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Still unread and still there for its real owner - the blocked attempt
    // from B had no side effect at all.
    const stillThere = await notifications.listForUser(u.a, true);
    expect(stillThere.some((n) => n.id === target!.id)).toBe(true);
  });

  it("markAllRead only marks the caller's own notifications and reports the count it changed", async () => {
    await issues.create(projectId, u.owner, { title: 'Mark-all A', assigneeId: u.a });
    await issues.create(projectId, u.owner, { title: 'Mark-all B', assigneeId: u.a });

    const before = await notifications.unreadCount(u.a);
    expect(before.count).toBeGreaterThanOrEqual(2);

    const result = await notifications.markAllRead(u.a);
    expect(result.marked).toBe(before.count);

    const after = await notifications.unreadCount(u.a);
    expect(after.count).toBe(0);

    // A second call marks nothing further - already all read.
    const secondResult = await notifications.markAllRead(u.a);
    expect(secondResult.marked).toBe(0);
  });

  it("listForUser never returns another user's notifications", async () => {
    const issue = await issues.create(projectId, u.owner, {
      title: 'Isolation issue',
      assigneeId: u.a,
    });
    const aInbox = await notifications.listForUser(u.a, false);
    expect(aInbox.every((n) => n.userId === u.a)).toBe(true);
    const bInbox = await notifications.listForUser(u.b, false);
    expect(bInbox.some((n) => n.issueId === issue.id)).toBe(false);
  });
});
