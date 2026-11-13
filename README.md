# B4F Board

B4F Board is a full-stack project-management application built with Next.js and NestJS — workspaces,
projects, issues, a drag-and-drop board, sprints/backlog, comments with `@mentions`, an activity
history, notifications, and a personal dashboard.

## Tech Stack

**Frontend (`web/`)**
- Next.js 15 (App Router) + React 19, TypeScript
- Tailwind CSS
- Redux Toolkit + React Redux (small, deliberately scoped client-side state)
- `@dnd-kit/core` (board drag-and-drop)
- Vitest + Testing Library (component tests)
- A server-only typed API client (`src/lib/api/`) and Server Actions (`src/lib/actions/`) —
  Client Components never call the backend directly

**Backend (`api/`)**
- NestJS, TypeScript
- Prisma + PostgreSQL
- JWT authentication via Passport (`@nestjs/passport`, `passport-jwt`), bcrypt password hashing
- class-validator / class-transformer DTOs
- Swagger/OpenAPI (served at `/api/docs`)
- Jest (unit + integration tests)

## Repository Structure

```
.
├── web/     # Next.js frontend
├── api/     # NestJS backend
└── README.md
```

Notable subfolders:
- `web/src/app/` — routes (App Router), grouped into `(auth)` (login/register, public) and `(app)`
  (everything else, session-required)
- `web/src/components/` — UI components, grouped by domain (`board/`, `issue/`, `sprint/`, `ui/`,
  `layout/`)
- `web/src/lib/api/` — typed server-only Nest API client, one file per resource
- `web/src/lib/actions/` — Server Actions (the only way a Client Component reaches the backend)
- `api/src/` — one NestJS module per domain area (`auth/`, `users/`, `workspaces/`, `projects/`,
  `issues/`, `sprints/`, `comments/`, `activity/`, `notifications/`)
- `api/prisma/` — `schema.prisma`, `migrations/`, `seed.ts`

## Prerequisites

- Node.js 18 or later (verified against Node 18.20)
- npm
- PostgreSQL 14 or later (a local, dedicated instance is recommended — see `api/README.md`,
  "Local database setup")

## Environment Variables

Real secrets are never committed. Copy each `.env.example` to `.env` and fill in real local
values.

**`api/.env`**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma format) |
| `PORT` | Port the Nest API listens on (default `4000`) |
| `WEB_ORIGIN` | Origin(s) allowed to call this API with credentials (the Next.js app) |
| `JWT_SECRET` | JWT signing secret — generate a real random secret for any non-local use |
| `JWT_EXPIRES_IN` | Access-token lifetime (e.g. `8h`) |

**`web/.env`**

| Variable | Purpose |
|---|---|
| `NEST_API_URL` | The Nest API's base URL, used only by the server-only typed API client — never exposed to the browser |
| `NODE_ENV` | Standard Node environment flag (`development` locally) |

## Installation

From a fresh clone:

```bash
git clone <this-repo-url>
cd b4f-board-final
```

Backend:

```bash
cd api
npm install
```

Frontend:

```bash
cd web
npm install
```

## Database Setup

A PostgreSQL database must exist before the backend will run. See `api/README.md`, "Local
database setup," for a fully self-contained, project-local Postgres instance (does not touch any
system-wide install).

Once a database exists and `api/.env`'s `DATABASE_URL` points at it:

```bash
cd api
npx prisma generate
npx prisma migrate dev      # applies the schema to a fresh database
npm run seed                # loads fictional demo data (prints demo logins when done)
```

## Running the Backend

```bash
cd api
npm run start:dev
```

Default port: **4000**. Swagger UI: `http://localhost:4000/api/docs`.

## Running the Frontend

```bash
cd web
npm run dev
```

Default port: **3000**.

## Running the Full Project

```text
Terminal 1 (backend):
  cd api && npm run start:dev

Terminal 2 (frontend):
  cd web && npm run dev
```

Open `http://localhost:3000`.

## Available Features

- Authentication (register, login, JWT session via an HttpOnly cookie)
- Workspaces (create, list, detail, settings) and workspace members (add, remove, change role)
- Projects
- Issues (create, edit, status/priority/assignee/story points)
- Board with drag-and-drop status changes, filtering and search
- Sprints (create, start, complete) and Backlog
- Comments with `@mention` autocomplete and rendered mention pills
- Activity history (per issue and per workspace)
- Notifications (list, unread count, mark read / mark all read, delete)
- Dashboard (issues assigned to you, recent activity across your workspaces)
- Profile (edit display name and password)

## Useful Commands

**Backend (`api/`)**

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with file-watch |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint (auto-fix) |
| `npm run test` | Jest unit/integration tests |
| `npx prisma generate` | Regenerate the Prisma client |
| `npx prisma migrate dev` | Apply schema changes locally |
| `npm run seed` | Reload fictional demo data |

**Frontend (`web/`)**

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest component tests |

## Development / Verification

To validate a fresh setup end to end:

```bash
# backend
cd api
npm run lint
npm run test
npm run build

# frontend
cd web
npm run lint
npm run test
npm run build
```

All four should complete without errors on a correctly configured database and `.env`.
