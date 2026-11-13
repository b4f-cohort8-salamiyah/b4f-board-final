import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SprintStatus, WorkspaceRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

// Minimal agile-planning layer (Phase C). Sprint rules, stated explicitly
// rather than left implicit (see specification/PRODUCT-SCOPE.md's reopened
// decision and context/DECISION-LOG.md):
//
//   1. Creating/editing/starting/completing a sprint is Admin/Owner-only -
//      same governance level as creating a Project (AUTH-AND-PERMISSIONS.md
//      already gates Project creation this way; a Sprint is the same kind
//      of project-level planning construct, not a per-issue action).
//   2. At most one ACTIVE sprint per project at a time. Enforced here, in a
//      transaction, rather than a DB constraint - consistent with how this
//      codebase already enforces its other business rules (e.g. "the
//      workspace owner cannot be removed") in the service layer, not SQL.
//   3. A sprint can only move PLANNED -> ACTIVE -> COMPLETED, one step at a
//      time, forward only. A COMPLETED sprint can never become ACTIVE again.
//   4. A COMPLETED sprint's name/goal/dates can no longer be edited - its
//      history is closed once finished.
//   5. An issue belongs to zero or one sprint (a single nullable FK, not a
//      join table - see schema.prisma). Assigning an issue to a sprint from
//      a different project is rejected (see IssuesService.update()).
@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getProjectOrThrow(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async getSprintOrThrow(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  private async pointsFor(sprintId: string) {
    const issues = await this.prisma.issue.findMany({
      where: { sprintId },
      select: { storyPoints: true, status: true },
    });
    const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const completedPoints = issues
      .filter((i) => i.status === 'DONE')
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    return {
      issueCount: issues.length,
      totalPoints,
      completedPoints,
      remainingPoints: totalPoints - completedPoints,
      completionPercent:
        totalPoints === 0 ? 0 : Math.round((completedPoints / totalPoints) * 100),
    };
  }

  async create(projectId: string, userId: string, dto: CreateSprintDto) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireRole(project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    return this.prisma.sprint.create({
      data: {
        projectId,
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async findAllForProject(projectId: string, userId: string) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireMembership(project.workspaceId, userId);
    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      sprints.map(async (sprint) => ({ ...sprint, points: await this.pointsFor(sprint.id) })),
    );
  }

  async findOne(sprintId: string, userId: string) {
    const sprint = await this.getSprintOrThrow(sprintId);
    await this.access.requireMembership(sprint.project.workspaceId, userId);
    const points = await this.pointsFor(sprintId);
    return { ...sprint, points };
  }

  async update(sprintId: string, userId: string, dto: UpdateSprintDto) {
    const sprint = await this.getSprintOrThrow(sprintId);
    await this.access.requireRole(sprint.project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('A completed sprint can no longer be edited');
    }
    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async start(sprintId: string, userId: string) {
    const sprint = await this.getSprintOrThrow(sprintId);
    await this.access.requireRole(sprint.project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new BadRequestException('Only a planned sprint can be started');
    }

    return this.prisma.$transaction(async (tx) => {
      const alreadyActive = await tx.sprint.findFirst({
        where: { projectId: sprint.projectId, status: SprintStatus.ACTIVE },
      });
      if (alreadyActive) {
        throw new ConflictException(
          `"${alreadyActive.name}" is already the active sprint for this project - complete it first`,
        );
      }
      const updated = await tx.sprint.update({
        where: { id: sprintId },
        data: { status: SprintStatus.ACTIVE },
      });
      await this.notifications.notifySprintLifecycle(
        {
          actorId: userId,
          type: 'SPRINT_STARTED',
          workspaceId: sprint.project.workspaceId,
          projectId: sprint.projectId,
          sprintId,
          sprintName: updated.name,
          projectName: sprint.project.name,
        },
        tx,
      );
      return updated;
    });
  }

  async complete(sprintId: string, userId: string) {
    const sprint = await this.getSprintOrThrow(sprintId);
    await this.access.requireRole(sprint.project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Only the active sprint can be completed');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sprint.update({
        where: { id: sprintId },
        data: { status: SprintStatus.COMPLETED },
      });
      await this.notifications.notifySprintLifecycle(
        {
          actorId: userId,
          type: 'SPRINT_COMPLETED',
          workspaceId: sprint.project.workspaceId,
          projectId: sprint.projectId,
          sprintId,
          sprintName: updated.name,
          projectName: sprint.project.name,
        },
        tx,
      );
      return updated;
    });
  }
}
