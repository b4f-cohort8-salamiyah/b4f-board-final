import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;
const SEARCH_RESULT_LIMIT = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async updateMe(userId: string, dto: UpdateUserDto) {
    const data: { name?: string; passwordHash?: string } = {};
    if (dto.name) data.name = dto.name;

    if (dto.password) {
      // Changing a password must prove knowledge of the current one - an
      // active session alone isn't enough (e.g. an unattended unlocked
      // laptop shouldn't let someone lock the real owner out). See the
      // Phase A audit fix.
      if (!dto.currentPassword) {
        throw new BadRequestException('currentPassword is required to change your password');
      }
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!currentMatches) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  // Backs the Dashboard screen - "issues assigned to me across every
  // workspace" has no other endpoint that could answer it. See
  // specification/API-SPECIFICATION.md, "Users".
  //
  // Authorization correction (Phase 3C.1): filtering on assigneeId alone is
  // insufficient - a user can be removed from a workspace while remaining
  // the historical assignee on one of its issues. The relational filter
  // below requires the caller to still be a WorkspaceMember of the issue's
  // workspace *at query time*, enforced in the database, not after
  // retrieval. See FINAL-PREVIEW-ACCEPTANCE.md for the regression test.
  async myIssues(userId: string) {
    return this.prisma.issue.findMany({
      where: {
        assigneeId: userId,
        project: {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { id: true, key: true, name: true, workspaceId: true } },
      },
    });
  }

  // GET /users/search - member-add and @mentions share this one endpoint
  // rather than each growing their own ad-hoc lookup. See the Phase B audit
  // follow-up.
  //
  // Bug fix (UX-hardening pass): these two callers need OPPOSITE membership
  // filtering, and this endpoint originally only supported one direction.
  // Add-member wants candidates who are NOT already in the workspace (no
  // point "adding" someone already there). @mentions need the opposite -
  // you can only mention someone who IS already a member (the backend
  // rejects mentioning a non-member, see requireAllMembersForMention) - so
  // excluding members there made every real member invisible to search the
  // moment they actually joined, which is exactly backwards. `membersOnly`
  // picks the direction; the default (unset) preserves the original
  // add-member behavior exactly.
  //
  // Privacy/safety, deliberate and narrow (closed-cohort teaching app, not a
  // public product):
  // - `q` has a server-enforced minimum length (see SearchUsersDto) so an
  //   empty/near-empty query can never dump the whole user directory.
  // - Only an authenticated user may search at all.
  // - A `workspaceId` scope is a real authorization boundary, not just a
  //   convenience filter: the caller must themselves be a member of that
  //   workspace (requireMembership throws 404 otherwise, matching every
  //   other "hidden resource" case in this API).
  async search(userId: string, dto: SearchUsersDto) {
    let memberIds: string[] = [];
    if (dto.workspaceId) {
      await this.access.requireMembership(dto.workspaceId, userId);
      const members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: dto.workspaceId },
        select: { userId: true },
      });
      memberIds = members.map((m) => m.userId);
    }

    // Prisma's `in: []` correctly matches nothing (not "no filter") - safe
    // even when a workspace has no other members yet to mention.
    const membershipFilter = dto.workspaceId
      ? dto.membersOnly === 'true'
        ? { id: { in: memberIds } }
        : { id: { notIn: memberIds } }
      : {};

    return this.prisma.user.findMany({
      where: {
        ...membershipFilter,
        OR: [
          { name: { contains: dto.q, mode: 'insensitive' } },
          { email: { contains: dto.q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: SEARCH_RESULT_LIMIT,
    });
  }

  async myActivity(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);
    if (workspaceIds.length === 0) return [];

    return this.prisma.activityLog.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: { select: { id: true, name: true } },
        issue: { select: { id: true, key: true, title: true } },
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}
