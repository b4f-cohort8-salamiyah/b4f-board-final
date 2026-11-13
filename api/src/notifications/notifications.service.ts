import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Per-user persistent inbox - see the NotificationType/Notification comments
// in schema.prisma for why this is deliberately NOT ActivityLog. Every
// caller goes through the specific notify*() methods below rather than the
// low-level create() directly, so the "never notify someone about their own
// action" and "one notification per person per event" rules live in exactly
// one place instead of being re-implemented in every service that triggers
// one (IssuesService, CommentsService, WorkspacesService, SprintsService).
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private create(
    data: Prisma.NotificationUncheckedCreateInput,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.notification.create({ data });
  }

  // Callers only ever have an actorId (the current authenticated user), not
  // a display name - resolving it here once keeps every notify*() call site
  // below from having to carry the actor's name through every intermediate
  // service method just for this.
  private async getActorName(actorId: string, tx: Prisma.TransactionClient | PrismaService) {
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { name: true } });
    return actor?.name ?? 'Someone';
  }

  // One MENTION per mentioned user, excluding the author - mentioning
  // yourself notifies no one (there's no one to tell). `context` controls
  // only the message wording; the stable reference is still the userId, per
  // common/mentions.util.ts.
  async notifyMentions(
    input: {
      actorId: string;
      mentionedUserIds: string[];
      workspaceId: string;
      projectId?: string;
      issueId?: string;
      issueKey?: string;
      commentId?: string;
      context: 'comment' | 'description';
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const recipients = input.mentionedUserIds.filter((id) => id !== input.actorId);
    if (recipients.length === 0) return recipients;
    const actorName = await this.getActorName(input.actorId, tx);
    const where =
      input.context === 'comment'
        ? `a comment on ${input.issueKey ?? 'an issue'}`
        : `${input.issueKey ?? 'an issue'}'s description`;
    for (const userId of recipients) {
      await this.create(
        {
          userId,
          type: NotificationType.MENTION,
          title: 'You were mentioned',
          message: `${actorName} mentioned you in ${where}.`,
          actorUserId: input.actorId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          issueId: input.issueId,
          commentId: input.commentId,
        },
        tx,
      );
    }
    return recipients;
  }

  // Only the NEW assignee is notified, never the previous one, and never the
  // actor themselves (self-assignment is not notification-worthy) - see
  // IssuesService.update(), which only calls this when assigneeChanged.
  async notifyIssueAssigned(
    input: {
      actorId: string;
      newAssigneeId: string;
      workspaceId: string;
      projectId: string;
      issueId: string;
      issueKey: string;
      issueTitle: string;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (input.newAssigneeId === input.actorId) return;
    const actorName = await this.getActorName(input.actorId, tx);
    await this.create(
      {
        userId: input.newAssigneeId,
        type: NotificationType.ISSUE_ASSIGNED,
        title: 'Issue assigned to you',
        message: `${actorName} assigned ${input.issueKey} — ${input.issueTitle} to you.`,
        actorUserId: input.actorId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        issueId: input.issueId,
      },
      tx,
    );
  }

  // Recipients are the reporter and the current assignee, minus the comment
  // author and minus anyone who already received a MENTION notification for
  // this same comment (see notifyMentions above) - a user mentioned in a
  // comment on their own reported/assigned issue gets exactly one
  // notification for it, not two. See CommentsService.create().
  async notifyComment(
    input: {
      actorId: string;
      reporterId: string | null;
      assigneeId: string | null;
      alreadyNotifiedUserIds: string[];
      workspaceId: string;
      projectId: string;
      issueId: string;
      issueKey: string;
      issueTitle: string;
      commentId: string;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const exclude = new Set([input.actorId, ...input.alreadyNotifiedUserIds]);
    const recipients = [...new Set([input.reporterId, input.assigneeId])].filter(
      (id): id is string => Boolean(id) && !exclude.has(id as string),
    );
    if (recipients.length === 0) return recipients;
    const actorName = await this.getActorName(input.actorId, tx);
    for (const userId of recipients) {
      await this.create(
        {
          userId,
          type: NotificationType.COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE,
          title: 'New comment',
          message: `${actorName} commented on ${input.issueKey} — ${input.issueTitle}.`,
          actorUserId: input.actorId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          issueId: input.issueId,
          commentId: input.commentId,
        },
        tx,
      );
    }
    return recipients;
  }

  // Only the target member - a role change is always performed by someone
  // else (WorkspacesService.updateMemberRole requires Owner to act on
  // ANOTHER member), but the actorId !== userId guard stays as the same
  // belt-and-braces self-notification guard used everywhere else here.
  async notifyWorkspaceRoleChanged(
    input: {
      actorId: string;
      targetUserId: string;
      workspaceId: string;
      workspaceName: string;
      newRole: string;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (input.targetUserId === input.actorId) return;
    const actorName = await this.getActorName(input.actorId, tx);
    await this.create(
      {
        userId: input.targetUserId,
        type: NotificationType.WORKSPACE_ROLE_CHANGED,
        title: 'Your role changed',
        message: `${actorName} changed your role to ${input.newRole} in ${input.workspaceName}.`,
        actorUserId: input.actorId,
        workspaceId: input.workspaceId,
      },
      tx,
    );
  }

  async notifyMemberAdded(
    input: {
      actorId: string;
      targetUserId: string;
      workspaceId: string;
      workspaceName: string;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (input.targetUserId === input.actorId) return;
    const actorName = await this.getActorName(input.actorId, tx);
    await this.create(
      {
        userId: input.targetUserId,
        type: NotificationType.MEMBER_ADDED,
        title: 'Added to a workspace',
        message: `${actorName} added you to ${input.workspaceName}.`,
        actorUserId: input.actorId,
        workspaceId: input.workspaceId,
      },
      tx,
    );
  }

  // Minimal, deliberately narrow rule (see the task's own "avoid noisy
  // notifications" instruction): only members with at least one issue
  // ASSIGNED to them in this sprint hear about its lifecycle, never the
  // whole workspace/project membership. The actor is excluded even if they
  // have an assigned issue in the sprint - starting/completing a sprint is
  // their own action.
  async notifySprintLifecycle(
    input: {
      actorId: string;
      type: 'SPRINT_STARTED' | 'SPRINT_COMPLETED';
      workspaceId: string;
      projectId: string;
      sprintId: string;
      sprintName: string;
      projectName: string;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const assignees = await tx.issue.findMany({
      where: { sprintId: input.sprintId, assigneeId: { not: null } },
      select: { assigneeId: true },
      distinct: ['assigneeId'],
    });
    const recipients = [...new Set(assignees.map((a) => a.assigneeId as string))].filter(
      (id) => id !== input.actorId,
    );
    const title = input.type === 'SPRINT_STARTED' ? 'Sprint started' : 'Sprint completed';
    const verb = input.type === 'SPRINT_STARTED' ? 'started' : 'completed';
    for (const userId of recipients) {
      await this.create(
        {
          userId,
          type: NotificationType[input.type],
          title,
          message: `${input.sprintName} ${verb} in ${input.projectName}.`,
          actorUserId: input.actorId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          sprintId: input.sprintId,
        },
        tx,
      );
    }
    return recipients;
  }

  async listForUser(userId: string, unreadOnly: boolean) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actorUser: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, key: true } },
        issue: { select: { id: true, key: true, title: true } },
        sprint: { select: { id: true, name: true } },
      },
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  // updateMany scoped to (id, userId) rather than findUnique-then-update: a
  // notification that exists but belongs to someone else must look
  // identical to one that doesn't exist at all - see the authorization
  // tests in notifications.integration.spec.ts. Never leak existence across
  // users via a different error for "not yours" vs "not found".
  async markRead(userId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
    return { marked: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: result.count };
  }

  async remove(userId: string, notificationId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
    return { deleted: true };
  }
}
