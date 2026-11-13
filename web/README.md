# B4F Board Web

Next.js (App Router, TypeScript, Tailwind) web client for the B4F Board instructor-only final
preview. Implements the frozen contract in `../../projects/b4f-board/specification/` — see that
folder for design rationale; this README is setup/operational only.

## Web session architecture (read this before touching auth code)

The raw JWT issued by the Nest API **never reaches browser JavaScript**. Login goes through a
Server Action that stores the token in an HttpOnly cookie; Server Components read it server-side
to call Nest; Client Component mutations go through Server Actions, never Nest directly. Full
design in `../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md`, "Web session
architecture" — verified for real (not just by code review) with a headless-browser check:
`document.cookie` cannot read the session cookie, and no JWT pattern appears anywhere in the
rendered page HTML.

## Setup

```bash
npm install
cp .env.example .env        # edit NEST_API_URL if the API isn't on localhost:4000
npm run dev
```

Requires the B4F Board API (`../api/`) running and seeded — see `../api/README.md`.

Web client listens on `http://localhost:3000`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Structure

- `src/lib/session/` — server-only cookie adapter (no business logic)
- `src/lib/api/` — server-only typed Nest API client (one file per resource)
- `src/lib/actions/` — Server Actions; the only way a Client Component reaches Nest
- `src/store/` — Redux Toolkit, deliberately small (current-user snapshot + a non-authoritative
  role/permission UX hint) — see `FRONTEND-ARCHITECTURE.md` for why membership/issues/projects/
  comments are *not* here
- `src/context/ThemeContext.tsx` — light/dark theme, Context's one job here
- `src/app/(auth)/` — login/register (public)
- `src/app/(app)/` — everything else (session required, enforced in this group's `layout.tsx`)

## Verified in a real browser (not just build/typecheck)

Login → dashboard → workspaces → workspace overview → project → board (filters/search) → issue
detail (status/priority/assignee controls, comments, activity) → theme toggle → register →
duplicate-email rejection → unauthenticated-redirect, all walked with Playwright against a live
dev server and seeded data, zero console errors. Screenshots are not committed (verification
artifacts, not project source).
