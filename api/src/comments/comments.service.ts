import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { extractMentionedUserIds } from '../common/mentions.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getIssueOrThrow(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  private async getCommentOrThrow(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { include: { project: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  async findAllForIssue(issueId: string, userId: string) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.access.requireMembership(issue.project.workspaceId, userId);
    return this.prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async create(issueId: string, userId: string, dto: CreateCommentDto) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.access.requireMembership(issue.project.workspaceId, userId);

    const mentionedUserIds = extractMentionedUserIds(dto.body);
    await this.access.requireAllMembersForMention(issue.project.workspaceId, mentionedUserIds);

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { issueId, authorId: userId, body: dto.body },
        include: { author: { select: { id: true, name: true } } },
      });
      await this.activity.record(
        {
          workspaceId: issue.project.workspaceId,
          issueId,
          actorId: userId,
          action: 'COMMENTED',
        },
        tx,
      );
      await this.activity.recordMentions(
        {
          workspaceId: issue.project.workspaceId,
          issueId,
          actorId: userId,
          mentionedUserIds,
          context: 'comment',
        },
        tx,
      );
      const mentioned = await this.notifications.notifyMentions(
        {
          actorId: userId,
          mentionedUserIds,
          workspaceId: issue.project.workspaceId,
          projectId: issue.projectId,
          issueId,
          issueKey: issue.key,
          commentId: comment.id,
          context: 'comment',
        },
        tx,
      );
      // Reporter + current assignee, minus the author and minus anyone who
      // already got a MENTION notification above for this exact comment -
      // see NotificationsService.notifyComment().
      await this.notifications.notifyComment(
        {
          actorId: userId,
          reporterId: issue.reporterId,
          assigneeId: issue.assigneeId,
          alreadyNotifiedUserIds: mentioned,
          workspaceId: issue.project.workspaceId,
          projectId: issue.projectId,
          issueId,
          issueKey: issue.key,
          issueTitle: issue.title,
          commentId: comment.id,
        },
        tx,
      );
      return comment;
    });
  }

  private async requireCanMutate(
    comment: { authorId: string | null },
    workspaceId: string,
    userId: string,
  ) {
    const membership = await this.access.requireMembership(workspaceId, userId);
    const isOwnerOrAdmin =
      membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;
    if (comment.authorId !== userId && !isOwnerOrAdmin) {
      throw new ForbiddenException(
        'Only the comment author or a workspace admin/owner may do that',
      );
    }
  }

  async update(commentId: string, userId: string, dto: CreateCommentDto) {
    const comment = await this.getCommentOrThrow(commentId);
    await this.requireCanMutate(comment, comment.issue.project.workspaceId, userId);

    const mentionedUserIds = extractMentionedUserIds(dto.body);
    await this.access.requireAllMembersForMention(
      comment.issue.project.workspaceId,
      mentionedUserIds,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.comment.update({
        where: { id: commentId },
        data: { body: dto.body },
        include: { author: { select: { id: true, name: true } } },
      });
      await this.activity.recordMentions(
        {
          workspaceId: comment.issue.project.workspaceId,
          issueId: comment.issueId,
          actorId: userId,
          mentionedUserIds,
          context: 'comment',
        },
        tx,
      );
      await this.notifications.notifyMentions(
        {
          actorId: userId,
          mentionedUserIds,
          workspaceId: comment.issue.project.workspaceId,
          projectId: comment.issue.projectId,
          issueId: comment.issueId,
          issueKey: comment.issue.key,
          commentId: comment.id,
          context: 'comment',
        },
        tx,
      );
      return updated;
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.getCommentOrThrow(commentId);
    await this.requireCanMutate(comment, comment.issue.project.workspaceId, userId);
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}
