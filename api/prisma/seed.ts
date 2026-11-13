// Seeds the B4F Board instructor preview with entirely fictional demo data.
// See ../../projects/b4f-board/specification/SEED-DATA.md - no real student
// names, emails, attendance data, or marks appear anywhere in this file.
import { PrismaClient, IssuePriority, IssueStatus, WorkspaceRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  checkSeedDatabaseUrl,
  SEED_SAFETY_OVERRIDE_ENV_VAR,
} from '../src/common/seed-safety.util';

const prisma = new PrismaClient();

// Demo-only, static, clearly fictional password for every seeded account.
// Never reused anywhere real - see api/README.md, "Demo accounts".
const DEMO_PASSWORD = 'b4fdemo123';

const DEMO_USERS = [
  { name: 'Dana Frontend', email: 'dana@b4fdemo.local' },
  { name: 'Sam Backend', email: 'sam@b4fdemo.local' },
  { name: 'Riley Designer', email: 'riley@b4fdemo.local' },
  { name: 'Jordan Product', email: 'jordan@b4fdemo.local' },
  { name: 'Casey QA', email: 'casey@b4fdemo.local' },
  { name: 'Morgan Support', email: 'morgan@b4fdemo.local' },
  { name: 'Taylor Intern', email: 'taylor@b4fdemo.local' },
] as const;

const WEB_TITLES = [
  'Fix broken footer link on mobile',
  'Homepage hero image loads too slowly',
  'Add newsletter signup form to blog sidebar',
  'Contact form does not validate email format',
  'Dark mode toggle flashes white on load',
  'Pricing page table breaks on narrow screens',
  'Add breadcrumbs to nested content pages',
  '404 page has no link back to homepage',
  'Improve color contrast on call-to-action buttons',
  'Add sitemap.xml for search indexing',
  'Testimonials carousel does not autoplay on Safari',
  'Reduce bundle size of marketing landing page',
  'Add cookie-consent banner',
  'Fix duplicate meta description on product pages',
  'Add loading skeleton to blog post list',
  'Support keyboard navigation on nav dropdown',
  'Update favicon set for new brand colors',
  'Add Open Graph tags for social sharing',
];

const API_TITLES = [
  'Add pagination to /projects/:id/issues',
  'Rate limit the /auth/login endpoint',
  'Fix N+1 query when listing workspace members',
  'Add request-id to every log line',
  'Return 409 instead of 500 on duplicate project key',
  'Add index on activity_logs.workspace_id',
  'Support filtering issues by multiple assignees',
  'Document error response shape in Swagger',
  'Add health-check endpoint for uptime monitoring',
  'Trim whitespace on incoming DTO string fields',
  'Add e2e test for the ownership-based issue edit rule',
  'Cache workspace membership lookups per request',
  'Add structured logging for auth failures',
  'Validate workspace slug uniqueness case-insensitively',
  'Add DB connection pool size to .env.example',
  'Return created-at/updated-at in ISO 8601 consistently',
  'Add graceful shutdown handling',
];

const MOB_TITLES = [
  'Design onboarding flow for first-time login',
  'Evaluate push-notification provider options',
  'Prototype offline board view',
  'Define shared design tokens with the web app',
  'Spike: reuse the Nest API bearer-token contract',
  'Draft issue-detail screen wireframe',
  'List required native permissions',
  'Decide on state-management approach for mobile',
  'Research app-store review requirements',
  'Define minimum supported OS versions',
  'Sketch bottom-tab navigation structure',
  'List analytics events to track at launch',
];

const STATUSES: IssueStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

// Idempotency (Phase 3C.1): `npm run seed` must be safely re-runnable
// against THIS dedicated local preview database without failing on
// duplicate users/workspaces. Deleting workspaces first (cascades to
// members/projects/issues/comments/activity per the schema's ON DELETE
// CASCADE relations - see DATABASE-PROGRESSION.md), then users, fully
// resets the fictional dataset in FK-safe order.
//
// This function must NEVER run against anything other than the isolated
// project-local Postgres instance documented in README.md - it is not a
// general-purpose reset utility and is not exported/reused elsewhere.
async function resetDemoData() {
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

// Runtime safety gate (Phase 3C.2): refuse to run the destructive reset
// above unless DATABASE_URL clearly points at the dedicated, isolated
// local B4F Board preview database - never merely "some database URL is
// set". See api/README.md, "Local database setup", and
// src/common/seed-safety.util.ts for the check itself.
function assertSafeToResetDemoData(): void {
  if (process.env[SEED_SAFETY_OVERRIDE_ENV_VAR] === 'true') {
    console.warn(
      `${SEED_SAFETY_OVERRIDE_ENV_VAR}=true is set - skipping the dedicated-local-preview-database ` +
        'safety check. Only use this for a deliberately configured alternate local preview setup, ' +
        'never to work around a real safety failure.',
    );
    return;
  }

  const result = checkSeedDatabaseUrl(process.env.DATABASE_URL);
  if (!result.safe) {
    throw new Error(
      [
        'Refusing to run the destructive demo seed: DATABASE_URL does not look like the dedicated',
        'local B4F Board preview database.',
        `  ${result.reason}`,
        '',
        'This check exists so `npm run seed` can never accidentally delete data from a database it',
        'was not built for - see api/README.md, "Local database setup".',
        '',
        `If this is a deliberately configured alternate local preview setup, set`,
        `${SEED_SAFETY_OVERRIDE_ENV_VAR}=true to explicitly bypass this check.`,
      ].join('\n'),
    );
  }
}

const STORY_POINTS = [1, 2, 3, 5, 8];

async function seedIssuesForProject(
  project: { id: string; key: string },
  workspaceId: string,
  titles: string[],
  memberIds: string[],
) {
  const created: { id: string; key: string }[] = [];

  for (let i = 0; i < titles.length; i++) {
    const seq = i + 1;
    // The final human-readable key is created with the issue itself, not
    // rewritten afterward - see DATABASE-PROGRESSION.md, "Transactions",
    // and FINAL-PREVIEW-ACCEPTANCE.md for why a placeholder-then-rewrite
    // approach was rejected (it let activity metadata briefly reference a
    // key that never really existed).
    const key = `${project.key}-${seq}`;
    const status = pick(STATUSES, i);
    const priority = pick(PRIORITIES, i + 1);
    // Roughly a quarter of issues stay unassigned, exercising the nullable field.
    const assigneeId = i % 4 === 3 ? null : memberIds[i % memberIds.length];
    const reporterId = memberIds[(i + 2) % memberIds.length];
    const createdAt = daysAgo(30 - Math.floor((i / titles.length) * 28));
    // Roughly a third of issues stay unestimated, exercising the nullable
    // field (see Phase C) - the rest get a plausible, varied point value.
    const storyPoints = i % 3 === 2 ? undefined : pick(STORY_POINTS, i);

    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key,
        title: titles[i],
        status,
        priority,
        assigneeId: assigneeId ?? undefined,
        reporterId,
        storyPoints,
        createdAt,
        updatedAt: createdAt,
      },
    });
    created.push({ id: issue.id, key: issue.key });

    await prisma.activityLog.create({
      data: {
        workspaceId,
        issueId: issue.id,
        actorId: reporterId,
        action: 'ISSUE_CREATED',
        metadata: { title: issue.title, key: issue.key },
        createdAt,
      },
    });

    if (status === 'DONE' || status === 'REVIEW') {
      await prisma.activityLog.create({
        data: {
          workspaceId,
          issueId: issue.id,
          actorId: assigneeId ?? reporterId,
          action: 'STATUS_CHANGED',
          metadata: { from: 'TODO', to: status },
          createdAt: daysAgo(30 - Math.floor((i / titles.length) * 28) - 1),
        },
      });
    }

    // Comments on roughly half the issues, from a different member than the author.
    if (i % 2 === 0) {
      const commentAuthor = memberIds[(i + 1) % memberIds.length];
      await prisma.comment.create({
        data: {
          issueId: issue.id,
          authorId: commentAuthor,
          body: pick(
            [
              'Picking this up now.',
              'Can you add a screenshot?',
              'Looks good, approving.',
              'This is blocked on the API change above.',
              'Confirmed fixed on staging.',
            ],
            i,
          ),
          createdAt: daysAgo(29 - Math.floor((i / titles.length) * 27)),
        },
      });
      await prisma.activityLog.create({
        data: {
          workspaceId,
          issueId: issue.id,
          actorId: commentAuthor,
          action: 'COMMENTED',
          createdAt: daysAgo(29 - Math.floor((i / titles.length) * 27)),
        },
      });
    }
  }

  // Project.issueSeq must stay coherent with the issues actually created,
  // so the app's own atomic-increment key generation (IssuesService.create)
  // continues from the right number for any issue created after seeding.
  await prisma.project.update({
    where: { id: project.id },
    data: { issueSeq: titles.length },
  });

  return created;
}

async function main() {
  assertSafeToResetDemoData();

  console.log('Resetting any existing demo data (dedicated local preview DB only)...');
  await resetDemoData();

  console.log('Seeding B4F Board demo data (fictional only)...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users: Record<string, { id: string }> = {};
  for (const u of DEMO_USERS) {
    users[u.email] = await prisma.user.create({
      data: { name: u.name, email: u.email, passwordHash },
    });
  }

  const dana = users['dana@b4fdemo.local'].id;
  const sam = users['sam@b4fdemo.local'].id;
  const riley = users['riley@b4fdemo.local'].id;
  const jordan = users['jordan@b4fdemo.local'].id;
  const casey = users['casey@b4fdemo.local'].id;
  const morgan = users['morgan@b4fdemo.local'].id;
  const taylor = users['taylor@b4fdemo.local'].id;

  // Workspace 1: Marketing Site Revamp
  const marketing = await prisma.workspace.create({
    data: { name: 'Marketing Site Revamp', slug: 'marketing-site-revamp', ownerId: dana },
  });
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: marketing.id, userId: dana, role: WorkspaceRole.OWNER },
      { workspaceId: marketing.id, userId: sam, role: WorkspaceRole.ADMIN },
      { workspaceId: marketing.id, userId: riley, role: WorkspaceRole.MEMBER },
      { workspaceId: marketing.id, userId: taylor, role: WorkspaceRole.MEMBER },
    ],
  });

  // Workspace 2: Internal Tools. Sam is Admin in Workspace 1 but only a
  // Member here - proves role is workspace-scoped, not global (see
  // specification/SEED-DATA.md).
  const internal = await prisma.workspace.create({
    data: { name: 'Internal Tools', slug: 'internal-tools', ownerId: jordan },
  });
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: internal.id, userId: jordan, role: WorkspaceRole.OWNER },
      { workspaceId: internal.id, userId: casey, role: WorkspaceRole.ADMIN },
      { workspaceId: internal.id, userId: morgan, role: WorkspaceRole.MEMBER },
      { workspaceId: internal.id, userId: sam, role: WorkspaceRole.MEMBER },
      { workspaceId: internal.id, userId: taylor, role: WorkspaceRole.MEMBER },
    ],
  });

  const webProject = await prisma.project.create({
    data: {
      workspaceId: marketing.id,
      name: 'Website',
      key: 'WEB',
      description: 'The public marketing site.',
    },
  });
  const apiProject = await prisma.project.create({
    data: {
      workspaceId: internal.id,
      name: 'Platform API',
      key: 'API',
      description: 'Shared internal API.',
    },
  });
  const mobProject = await prisma.project.create({
    data: {
      workspaceId: internal.id,
      name: 'Mobile Companion',
      key: 'MOB',
      description: 'Early-stage mobile client exploration.',
    },
  });

  const webIssues = await seedIssuesForProject(webProject, marketing.id, WEB_TITLES, [
    dana,
    sam,
    riley,
    taylor,
  ]);
  await seedIssuesForProject(apiProject, internal.id, API_TITLES, [
    jordan,
    casey,
    morgan,
    sam,
  ]);
  await seedIssuesForProject(mobProject, internal.id, MOB_TITLES, [jordan, casey, taylor]);

  // Minimal agile-planning layer demo data (Phase C) - deliberately only on
  // the Website project, not every project, per "don't make seed data
  // huge". An ACTIVE sprint with a few issues moved in (covering every
  // status, so the board demonstrates all four columns) and one PLANNED
  // sprint still sitting empty in the backlog view.
  const activeSprint = await prisma.sprint.create({
    data: { projectId: webProject.id, name: 'Sprint 4', goal: 'Polish before the demo', status: 'ACTIVE' },
  });
  await prisma.sprint.create({
    data: { projectId: webProject.id, name: 'Sprint 5', goal: 'Accessibility pass', status: 'PLANNED' },
  });
  const sprintIssues = webIssues.slice(0, 6);
  await prisma.issue.updateMany({
    where: { id: { in: sprintIssues.map((i) => i.id) } },
    data: { sprintId: activeSprint.id },
  });

  // One seeded @mention, exercising Phase E's render path from the first
  // login a student/instructor sees - a real comment referencing a real
  // seeded user by their stable id, not by name.
  await prisma.comment.create({
    data: {
      issueId: webIssues[0].id,
      authorId: dana,
      body: `@[Sam Backend](${sam}) can you take a pass at this before the sprint review?`,
      createdAt: daysAgo(1),
    },
  });
  await prisma.activityLog.create({
    data: {
      workspaceId: marketing.id,
      issueId: webIssues[0].id,
      actorId: dana,
      action: 'MENTIONED',
      metadata: { mentionedUserId: sam, context: 'comment' },
      createdAt: daysAgo(1),
    },
  });

  const totalIssues = await prisma.issue.count();
  console.log(
    `Seed complete: ${DEMO_USERS.length} users, 2 workspaces, 3 projects, ${totalIssues} issues, ` +
      '1 active sprint, 1 planned sprint.',
  );
  console.log('');
  console.log('Demo logins (teaching-only, never reuse this password anywhere real):');
  console.log(`  Owner  - dana@b4fdemo.local   / ${DEMO_PASSWORD}`);
  console.log(`  Admin  - casey@b4fdemo.local  / ${DEMO_PASSWORD}`);
  console.log(`  Member - morgan@b4fdemo.local / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
