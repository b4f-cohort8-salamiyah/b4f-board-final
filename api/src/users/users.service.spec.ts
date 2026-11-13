import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { UsersService } from './users.service';

// Integration test against the REAL local preview database - see
// src/integration/authorization.integration.spec.ts for why a mocked Prisma
// client isn't used for this kind of check in this codebase. Covers the
// Phase A audit fix: changing a password must prove knowledge of the
// current one.
describe('UsersService.updateMe - current-password verification', () => {
  const prisma = new PrismaService();
  const users = new UsersService(prisma, new WorkspaceAccessService(prisma));
  const runId = Date.now();
  const email = `test-${runId}-password-change@b4ftest.local`;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const passwordHash = await bcrypt.hash('original-password-123', 10);
    const user = await prisma.user.create({
      data: { name: 'Password Change Test', email, passwordHash },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('allows changing the display name alone, with no currentPassword required', async () => {
    const updated = await users.updateMe(userId, { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');
  });

  it('rejects a password change with no currentPassword', async () => {
    await expect(
      users.updateMe(userId, { password: 'new-password-123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a password change with the wrong currentPassword', async () => {
    await expect(
      users.updateMe(userId, {
        password: 'new-password-123',
        currentPassword: 'definitely-wrong',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a password change with the correct currentPassword, and the new password verifies', async () => {
    await users.updateMe(userId, {
      password: 'new-password-123',
      currentPassword: 'original-password-123',
    });
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await expect(bcrypt.compare('new-password-123', refreshed.passwordHash)).resolves.toBe(
      true,
    );
    await expect(
      bcrypt.compare('original-password-123', refreshed.passwordHash),
    ).resolves.toBe(false);
  });
});
