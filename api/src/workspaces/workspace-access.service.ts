import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Shared by workspaces/projects/issues/comments - the one place that decides
// "does this user belong to this workspace, and with what role". See
// specification/AUTH-AND-PERMISSIONS.md, "Concrete authorization rules".
//
// A non-member gets 404, not 403, everywhere - see
// specification/API-SPECIFICATION.md, "Validation / error model": we never
// confirm a resource exists to someone who can't see it.
@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    return membership;
  }

  async requireRole(workspaceId: string, userId: string, roles: WorkspaceRole[]) {
    const membership = await this.requireMembership(workspaceId, userId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException(
        `Requires one of these workspace roles: ${roles.join(', ')}`,
      );
    }
    return membership;
  }

  // Mentions (Phase E) are workspace-scoped, not a global user search - see
  // common/mentions.util.ts. A BadRequestException, not the 404 that
  // requireMembership uses for "this isn't yours to see", because this is
  // about the submitted content being invalid, not about hiding a resource.
  async requireAllMembersForMention(workspaceId: string, userIds: string[]) {
    if (userIds.length === 0) return;
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { in: userIds } },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    if (userIds.some((id) => !memberIds.has(id))) {
      throw new BadRequestException(
        'Cannot mention a user who is not a member of this workspace',
      );
    }
  }
}
