import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceAccessService } from './workspace-access.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const existingSlug = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('That workspace slug is already taken');
    }

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.name, slug: dto.slug, ownerId: userId },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId, role: WorkspaceRole.OWNER },
      });
      return workspace;
    });
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: { _count: { select: { projects: true, members: true } } },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => ({ ...m.workspace, myRole: m.role }));
  }

  async findOne(workspaceId: string, userId: string) {
    const membership = await this.access.requireMembership(workspaceId, userId);
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: { _count: { select: { projects: true, members: true } } },
    });
    return { ...workspace, myRole: membership.role };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    await this.access.requireRole(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: dto });
  }

  async remove(workspaceId: string, userId: string) {
    await this.access.requireRole(workspaceId, userId, [WorkspaceRole.OWNER]);
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { deleted: true };
  }

  async listMembers(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(workspaceId: string, actorId: string, dto: AddMemberDto) {
    await this.access.requireRole(workspaceId, actorId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!targetUser) {
      throw new NotFoundException('No B4F Board account exists for that email yet');
    }

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });
    if (existingMembership) {
      throw new ConflictException('That user is already a member');
    }

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { name: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.create({
        data: { workspaceId, userId: targetUser.id, role: WorkspaceRole.MEMBER },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await this.activity.record(
        {
          workspaceId,
          actorId,
          action: 'MEMBER_ADDED',
          metadata: { targetUserId: targetUser.id, targetName: targetUser.name },
        },
        tx,
      );
      await this.notifications.notifyMemberAdded(
        {
          actorId,
          targetUserId: targetUser.id,
          workspaceId,
          workspaceName: workspace.name,
        },
        tx,
      );
      return member;
    });
  }

  async updateMemberRole(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    // Only Owner may change another member's role to/from Admin - see
    // specification/AUTH-AND-PERMISSIONS.md.
    await this.access.requireRole(workspaceId, actorId, [WorkspaceRole.OWNER]);

    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!target) {
      throw new NotFoundException('That user is not a member of this workspace');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('The workspace owner’s role cannot be changed here');
    }

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { name: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
        data: { role: dto.role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await this.activity.record(
        {
          workspaceId,
          actorId,
          action: 'MEMBER_ROLE_CHANGED',
          metadata: { targetUserId, from: target.role, to: dto.role },
        },
        tx,
      );
      await this.notifications.notifyWorkspaceRoleChanged(
        {
          actorId,
          targetUserId,
          workspaceId,
          workspaceName: workspace.name,
          newRole: dto.role,
        },
        tx,
      );
      return updated;
    });
  }

  async removeMember(workspaceId: string, actorId: string, targetUserId: string) {
    const actorMembership = await this.access.requireMembership(workspaceId, actorId);
    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!target) {
      throw new NotFoundException('That user is not a member of this workspace');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('The workspace owner cannot be removed');
    }
    if (target.role === WorkspaceRole.ADMIN && actorMembership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the workspace owner may remove an admin');
    }
    if (
      actorMembership.role !== WorkspaceRole.OWNER &&
      actorMembership.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException('Only an owner or admin may remove members');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      });
      await this.activity.record(
        {
          workspaceId,
          actorId,
          action: 'MEMBER_REMOVED',
          metadata: { targetUserId, targetName: target.user.name },
        },
        tx,
      );
      return { removed: true };
    });
  }

  async listActivity(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.activity.listForWorkspace(workspaceId);
  }
}
