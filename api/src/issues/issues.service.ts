import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { extractMentionedUserIds } from '../common/mentions.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getProjectOrThrow(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async getIssueOrThrow(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  // Assignee, reporter, or workspace Admin/Owner - see
  // specification/AUTH-AND-PERMISSIONS.md, the one ownership-based rule.
  private async requireCanMutate(
    issue: { assigneeId: string | null; reporterId: string | null },
    workspaceId: string,
    userId: string,
  ) {
    const membership = await this.access.requireMembership(workspaceId, userId);
    const isOwnerOrAdmin =
      membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;
    const isAssigneeOrReporter = issue.assigneeId === userId || issue.reporterId === userId;
    if (!isOwnerOrAdmin && !isAssigneeOrReporter) {
      throw new ForbiddenException(
        'Only the assignee, reporter, or a workspace admin/owner may do that',
      );
    }
  }

  async create(projectId: string, userId: string, dto: CreateIssueDto) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireMembership(project.workspaceId, userId);

    if (dto.assigneeId) {
      await this.access.requireMembership(project.workspaceId, dto.assigneeId);
    }

    if (dto.sprintId) {
      // Same rule as update() - a sprint only ever makes sense for issues in
      // its own project. See the Phase "workflow correction": an issue is
      // NEVER required to have a sprint at creation (omitting sprintId is
      // the normal, default Backlog case) - this check only runs when the
      // caller explicitly asked to create directly into one (e.g. the Board,
      // which defaults new issues into the active sprint).
      const sprint = await this.prisma.sprint.findUnique({ where: { id: dto.sprintId } });
      if (!sprint || sprint.projectId !== projectId) {
        throw new BadRequestException('That sprint does not belong to this project');
      }
    }

    const mentionedUserIds = extractMentionedUserIds(dto.description);
    await this.access.requireAllMembersForMention(project.workspaceId, mentionedUserIds);

    // Atomic increment + create in one transaction, so the human-readable key
    // (e.g. WEB-42) is safe against concurrent creations racing on the same
    // project - see specification/DATABASE-PROGRESSION.md, "Transactions".
    return this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: { issueSeq: { increment: 1 } },
      });
      const issue = await tx.issue.create({
        data: {
          projectId,
          key: `${updatedProject.key}-${updatedProject.issueSeq}`,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          assigneeId: dto.assigneeId,
          storyPoints: dto.storyPoints,
          sprintId: dto.sprintId,
          reporterId: userId,
        },
      });
      await this.activity.record(
        {
          workspaceId: project.workspaceId,
          issueId: issue.id,
          actorId: userId,
          action: 'ISSUE_CREATED',
          metadata: { title: issue.title, key: issue.key },
        },
        tx,
      );
      await this.activity.recordMentions(
        {
          workspaceId: project.workspaceId,
          issueId: issue.id,
          actorId: userId,
          mentionedUserIds,
          context: 'description',
        },
        tx,
      );
      await this.notifications.notifyMentions(
        {
          actorId: userId,
          mentionedUserIds,
          workspaceId: project.workspaceId,
          projectId,
          issueId: issue.id,
          issueKey: issue.key,
          context: 'description',
        },
        tx,
      );
      if (dto.assigneeId) {
        await this.notifications.notifyIssueAssigned(
          {
            actorId: userId,
            newAssigneeId: dto.assigneeId,
            workspaceId: project.workspaceId,
            projectId,
            issueId: issue.id,
            issueKey: issue.key,
            issueTitle: issue.title,
          },
          tx,
        );
      }
      return issue;
    });
  }

  async findAllForProject(projectId: string, userId: string, query: QueryIssuesDto) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireMembership(project.workspaceId, userId);

    const where: Prisma.IssueWhereInput = { projectId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignee) where.assigneeId = query.assignee;
    if (query.sprintId) where.sprintId = query.sprintId;
    else if (query.backlog === 'true') where.sprintId = null;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { key: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async findOne(issueId: string, userId: string) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.access.requireMembership(issue.project.workspaceId, userId);
    return this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        assignee: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        project: {
          select: { id: true, key: true, name: true, workspaceId: true },
        },
        _count: { select: { comments: true } },
      },
    });
  }

  async update(issueId: string, userId: string, dto: UpdateIssueDto) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.requireCanMutate(issue, issue.project.workspaceId, userId);

    if (dto.assigneeId) {
      await this.access.requireMembership(issue.project.workspaceId, dto.assigneeId);
    }

    if (dto.sprintId) {
      // An active sprint (or any sprint) only ever makes sense for issues in
      // its own project - see SprintsService's documented rules.
      const sprint = await this.prisma.sprint.findUnique({ where: { id: dto.sprintId } });
      if (!sprint || sprint.projectId !== issue.projectId) {
        throw new BadRequestException('That sprint does not belong to this issue’s project');
      }
    }

    const mentionedUserIds =
      dto.description !== undefined ? extractMentionedUserIds(dto.description) : [];
    await this.access.requireAllMembersForMention(issue.project.workspaceId, mentionedUserIds);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id: issueId },
        data: dto,
      });

      // Phase F audit fix: these were previously if/else-if, so a single
      // PATCH changing BOTH status and assignee only ever recorded one of
      // the two activity entries. Each tracked field is now checked
      // independently, so both get their own entry when both change; a
      // change to neither (e.g. only title/description/priority/points)
      // still falls back to one generic ISSUE_UPDATED, same as before.
      const statusChanged = Boolean(dto.status && dto.status !== issue.status);
      const assigneeChanged =
        dto.assigneeId !== undefined && dto.assigneeId !== issue.assigneeId;

      if (statusChanged) {
        await this.activity.record(
          {
            workspaceId: issue.project.workspaceId,
            issueId,
            actorId: userId,
            action: 'STATUS_CHANGED',
            metadata: { from: issue.status, to: dto.status },
          },
          tx,
        );
      }
      if (assigneeChanged) {
        await this.activity.record(
          {
            workspaceId: issue.project.workspaceId,
            issueId,
            actorId: userId,
            action: 'ASSIGNED',
            metadata: { from: issue.assigneeId, to: dto.assigneeId },
          },
          tx,
        );
      }
      if (!statusChanged && !assigneeChanged) {
        await this.activity.record(
          {
            workspaceId: issue.project.workspaceId,
            issueId,
            actorId: userId,
            action: 'ISSUE_UPDATED',
          },
          tx,
        );
      }

      if (mentionedUserIds.length > 0) {
        await this.activity.recordMentions(
          {
            workspaceId: issue.project.workspaceId,
            issueId,
            actorId: userId,
            mentionedUserIds,
            context: 'description',
          },
          tx,
        );
        await this.notifications.notifyMentions(
          {
            actorId: userId,
            mentionedUserIds,
            workspaceId: issue.project.workspaceId,
            projectId: issue.projectId,
            issueId,
            issueKey: issue.key,
            context: 'description',
          },
          tx,
        );
      }

      // Only a real hand-off to someone new notifies - unassigning (dto.assigneeId
      // === null) or leaving it unchanged never does, per IssuesService's own
      // assigneeChanged check above.
      if (assigneeChanged && dto.assigneeId) {
        await this.notifications.notifyIssueAssigned(
          {
            actorId: userId,
            newAssigneeId: dto.assigneeId,
            workspaceId: issue.project.workspaceId,
            projectId: issue.projectId,
            issueId,
            issueKey: issue.key,
            issueTitle: updated.title,
          },
          tx,
        );
      }

      return updated;
    });
  }

  async remove(issueId: string, userId: string) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.requireCanMutate(issue, issue.project.workspaceId, userId);
    await this.prisma.issue.delete({ where: { id: issueId } });
    return { deleted: true };
  }

  async listActivity(issueId: string, userId: string) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.access.requireMembership(issue.project.workspaceId, userId);
    return this.activity.listForIssue(issueId);
  }
}
