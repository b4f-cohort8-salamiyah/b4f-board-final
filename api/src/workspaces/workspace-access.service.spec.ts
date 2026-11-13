import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from './workspace-access.service';

// This service is the single authorization gate every other module depends
// on - see specification/AUTH-AND-PERMISSIONS.md. These tests exist to keep
// its two contracts pinned: non-members get 404 (never 403), and role checks
// reject anyone outside the allowed set.
describe('WorkspaceAccessService', () => {
  let service: WorkspaceAccessService;
  let prisma: { workspaceMember: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { workspaceMember: { findUnique: jest.fn() } };
    service = new WorkspaceAccessService(prisma as unknown as PrismaService);
  });

  describe('requireMembership', () => {
    it('returns the membership when it exists', async () => {
      const membership = {
        workspaceId: 'w1',
        userId: 'u1',
        role: WorkspaceRole.MEMBER,
      };
      prisma.workspaceMember.findUnique.mockResolvedValue(membership);

      await expect(service.requireMembership('w1', 'u1')).resolves.toBe(membership);
    });

    it('throws NotFoundException, not ForbiddenException, for a non-member', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.requireMembership('w1', 'stranger')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('requireRole', () => {
    it('passes when the member has an allowed role', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'w1',
        userId: 'u1',
        role: WorkspaceRole.ADMIN,
      });

      await expect(
        service.requireRole('w1', 'u1', [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException when the member has a disallowed role', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'w1',
        userId: 'u1',
        role: WorkspaceRole.MEMBER,
      });

      await expect(
        service.requireRole('w1', 'u1', [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException (not Forbidden) when the caller is not a member at all', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        service.requireRole('w1', 'stranger', [WorkspaceRole.OWNER]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
