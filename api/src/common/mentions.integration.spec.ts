import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { IssuesService } from '../issues/issues.service';
import { CommentsService } from '../comments/comments.service';
import { extractMentionedUserIds } from './mentions.util';

describe('extractMentionedUserIds', () => {
  it('extracts one or more mention IDs from text', () => {
    const text = 'Hey @[Dana Frontend](8cd25b15-362b-4078-b6f4-92d8f5a30af2), check this out.';
    expect(extractMentionedUserIds(text)).toEqual(['8cd25b15-362b-4078-b6f4-92d8f5a30af2']);
  });

  it('returns an empty array for text with no mentions', () => {
    expect(extractMentionedUserIds('just plain text')).toEqual([]);
    expect(extractMentionedUserIds(null)).toEqual([]);
    expect(extractMentionedUserIds(undefined)).toEqual([]);
  });

  it('de-duplicates repeated mentions of the same user', () => {
    const id = '8cd25b15-362b-4078-b6f4-92d8f5a30af2';
    const text = `@[Dana](${id}) and again @[Dana Frontend](${id})`;
    expect(extractMentionedUserIds(text)).toEqual([id]);
  });
});

// Integration test against the REAL local preview database - see
// src/integration/authorization.integration.spec.ts. Covers Phase E:
// mentions are workspace-scoped (a non-member can't be mentioned), and a
// valid mention records a MENTIONED activity entry.
describe('Mentions (integration)', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const projects = new ProjectsService(prisma, access);
  const issues = new IssuesService(prisma, access, activity, notifications);
  const comments = new CommentsService(prisma, access, activity, notifications);

  const runId = Date.now();
  const u: Record<string, string> = {};
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['owner', 'member', 'outsider']) {
      const user = await prisma.user.create({
        data: {
          name: `Mention Test ${label}`,
          email: `mention-${runId}-${label}@b4ftest.local`,
          passwordHash: 'x',
        },
      });
      u[label] = user.id;
    }

    const ws = await workspaces.create(u.owner, {
      name: `Mention Test Workspace ${runId}`,
      slug: `mention-test-${runId}`,
    });
    workspaceId = ws.id;
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: u.member, role: 'MEMBER' },
    });

    const project = await projects.create(workspaceId, u.owner, {
      name: 'Mention Test Project',
      key: `MT${runId.toString().slice(-6)}`,
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  it('rejects a comment that mentions a non-member', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'For mention tests' });
    await expect(
      comments.create(issue.id, u.owner, {
        body: `Hey @[Outsider](${u.outsider}), look at this.`,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a comment mentioning a real member and records a MENTIONED activity entry', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'For mention tests 2' });
    await comments.create(issue.id, u.owner, {
      body: `Hey @[Mention Test member](${u.member}), please review.`,
    });

    const entries = await activity.listForIssue(issue.id);
    const mentionEntry = entries.find((e) => e.action === 'MENTIONED');
    expect(mentionEntry).toBeDefined();
    expect(mentionEntry?.metadata).toMatchObject({
      mentionedUserId: u.member,
      context: 'comment',
    });
  });

  it('rejects an issue description that mentions a non-member', async () => {
    await expect(
      issues.create(projectId, u.owner, {
        title: 'Bad mention',
        description: `cc @[Outsider](${u.outsider})`,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mentioning yourself records no activity entry', async () => {
    const issue = await issues.create(projectId, u.owner, { title: 'Self mention test' });
    await comments.create(issue.id, u.owner, {
      body: `Note to self @[Mention Test owner](${u.owner})`,
    });
    const entries = await activity.listForIssue(issue.id);
    expect(entries.some((e) => e.action === 'MENTIONED')).toBe(false);
  });
});
