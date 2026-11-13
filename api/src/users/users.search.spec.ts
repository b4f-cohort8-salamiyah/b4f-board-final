import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from './users.service';

// Integration test against the REAL local preview database - see
// src/integration/authorization.integration.spec.ts. Covers the Phase B
// GET /users/search endpoint: name/email matching, excluding existing
// workspace members, and the workspaceId membership boundary.
describe('UsersService.search', () => {
  const prisma = new PrismaService();
  const access = new WorkspaceAccessService(prisma);
  const activity = new ActivityService(prisma);
  const notifications = new NotificationsService(prisma);
  const workspaces = new WorkspacesService(prisma, access, activity, notifications);
  const users = new UsersService(prisma, access);

  const runId = Date.now();
  const u: Record<string, string> = {};
  let workspaceId: string;

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['findable', 'member', 'outsider']) {
      const user = await prisma.user.create({
        data: {
          name: `Search Target ${label} ${runId}`,
          email: `search-${runId}-${label}@b4ftest.local`,
          passwordHash: 'x',
        },
      });
      u[label] = user.id;
    }

    const ws = await workspaces.create(u.member, {
      name: `Search Test Workspace ${runId}`,
      slug: `search-test-${runId}`,
    });
    workspaceId = ws.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await prisma.$disconnect();
  });

  it('finds a user by a partial, case-insensitive name match', async () => {
    const results = await users.search(u.member, {
      q: `search target findable ${runId}`.slice(0, 20),
    });
    expect(results.some((r) => r.id === u.findable)).toBe(true);
  });

  it('finds a user by a partial email match', async () => {
    const results = await users.search(u.member, { q: `search-${runId}-findable` });
    expect(results.map((r) => r.id)).toContain(u.findable);
  });

  it('never returns a passwordHash field', async () => {
    const results = await users.search(u.member, { q: `search-${runId}` });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).not.toHaveProperty('passwordHash');
    }
  });

  it('excludes users who are already a member of the given workspace', async () => {
    const results = await users.search(u.member, { q: `search-${runId}`, workspaceId });
    expect(results.map((r) => r.id)).not.toContain(u.member);
    expect(results.map((r) => r.id)).toContain(u.findable);
  });

  it('rejects a workspaceId the caller is not themselves a member of', async () => {
    await expect(
      users.search(u.outsider, { q: `search-${runId}`, workspaceId }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // Regression for the UX-correction-pass mention bug: @mentions can only
  // ever target an existing workspace member, so the mention search needs
  // the OPPOSITE filter from the add-member picker above (which excludes
  // members) - membersOnly=true must include ONLY members, not exclude them.
  it('membersOnly=true returns ONLY existing workspace members, not non-members', async () => {
    const results = await users.search(u.member, {
      q: `search-${runId}`,
      workspaceId,
      membersOnly: 'true',
    });
    expect(results.map((r) => r.id)).toContain(u.member);
    expect(results.map((r) => r.id)).not.toContain(u.findable);
    expect(results.map((r) => r.id)).not.toContain(u.outsider);
  });

  it('membersOnly is a no-op without a workspaceId (no membership context to filter by)', async () => {
    const results = await users.search(u.member, {
      q: `search-${runId}`,
      membersOnly: 'true',
    });
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining([u.findable, u.member, u.outsider]),
    );
  });
});
