# B4F Board API

NestJS domain backend for the B4F Board instructor-only final preview. Implements the frozen
contract in `../../projects/b4f-board/specification/` — see that folder for the actual design
rationale; this README is setup/operational only.

## Stack

NestJS, TypeScript, PostgreSQL via Prisma, JWT auth (bcrypt password hashing), class-validator
DTOs, Swagger/OpenAPI.

## Local database setup

This preview uses an **isolated, project-local PostgreSQL instance** — it does not touch any
system-wide Postgres install. This was a deliberate choice so the preview is fully self-contained
and reproducible regardless of what else is installed on the machine.

```bash
# One-time setup (requires Homebrew's postgresql@14 formula: brew install postgresql@14)
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
cd api
initdb -D .pgdata -U <your-username> --auth=trust -E UTF8
pg_ctl -D .pgdata -l .pgdata.log -o "-p 5433 -k /tmp" start
createdb -h /tmp -p 5433 -U <your-username> b4f_board
```

`.pgdata/` and its logs are gitignored — this is local development state, not part of the
repository. To stop the database: `pg_ctl -D .pgdata stop`.

## Setup

```bash
npm install
cp .env.example .env        # edit DATABASE_URL's username if different from the default
npx prisma migrate dev      # applies the schema
npm run seed                # loads fictional demo data - see prisma/seed.ts
npm run start:dev
```

API listens on `http://localhost:4000`. Swagger UI at `http://localhost:4000/api/docs`.

## Demo accounts

See `prisma/seed.ts` output after seeding — it prints one login per role (Owner/Admin/Member).
All seeded users are fictional (`@b4fdemo.local`) with a single shared, clearly-labeled demo
password. Never reuse this password anywhere real.

`npm run seed` is safe to re-run at any time: it first deletes all existing demo workspaces/users
from **this dedicated local preview database only**, then recreates the fictional dataset from
scratch. Never point `DATABASE_URL` at anything other than the isolated instance described above.

**Safety gate:** before doing anything destructive, the seed script checks that `DATABASE_URL`
actually points at the dedicated local preview database — host `localhost`/`127.0.0.1`, port
`5433`, database name `b4f_board` (see `src/common/seed-safety.util.ts`). If `DATABASE_URL` doesn't
match, the script aborts with a clear error before deleting anything. If you've deliberately set up
a different local preview database and know what you're doing, set
`SEED_ALLOW_UNSAFE_DATABASE_URL=true` to bypass the check — never set this to work around a real
safety failure.

## Scripts

| Command                  | Purpose                     |
| ------------------------ | --------------------------- |
| `npm run start:dev`      | Run with file-watch         |
| `npm run build`          | Production build to `dist/` |
| `npm run lint`           | ESLint (auto-fix)           |
| `npm run test`           | Jest unit tests             |
| `npx prisma migrate dev` | Apply schema changes        |
| `npm run seed`           | Reload fictional demo data  |

## Architecture notes

- `src/workspaces/workspace-access.service.ts` is the single authorization gate every other
  module depends on (membership + role checks). A non-member gets 404, never 403 — see
  `../../projects/b4f-board/specification/API-SPECIFICATION.md`.
- Issue key generation (`WEB-42`) is done inside a Prisma transaction that atomically increments
  the parent project's counter — see `IssuesService.create()` and
  `../../projects/b4f-board/specification/DATABASE-PROGRESSION.md`, "Transactions".
- Every **runtime application** action writes activity through `ActivityService` — no controller
  or service outside it touches the `activity_logs` table directly. `prisma/seed.ts` is the one
  documented exception: it creates matching fixture history rows directly (there is no "user" to
  act as the caller during a one-shot database bootstrap), so the seeded demo data has a
  believable activity feed from the moment the app starts. That fixture history is not routed
  through `ActivityService` because there is no request/response cycle to route it through — this
  is a deliberate distinction, not an inconsistency.
