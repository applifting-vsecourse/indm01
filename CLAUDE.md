# Quacker — starter template

Full-stack teaching template: pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

The worked example is the quack feed: `Quack` model → seed → repository → service → `GET`/`POST /api/quacks` (DTO-validated, author taken from the session) → zod schema → TanStack Query → list page + post form. Copy its pattern for new features.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`DESIGN.md`](DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

### Escape user input in Prisma text filters

Prisma passes `contains`/`startsWith`/`endsWith` values to `LIKE` unescaped, so `%` and `_` from a user act as wildcards (searching `%` matches everything). Escape `\`, `%` and `_` in the repository. Repository tests mock Prisma and won't catch this — run a new filter once against the dev database.

### "One per…" rules belong in the database

If the story says a person may do something once (one vote per poll, one reaction per quack), make it a unique index, and tie related rows together with a foreign key (a vote's answer must belong to the vote's poll) — a service check alone loses races and gets bypassed by the next write path. Computed counts (count the rows) beat stored counters for the same reason. Service tests mock Prisma and can't prove a constraint: try the forbidden insert once in `psql` against the dev database and see it rejected.

### Enforce authorization on the server, not just in UI

Hiding an action in the frontend is a convenience, never a security boundary. Always enforce authorization rules on the server (in the service or guard) — verify ownership or roles (`admin`/`moderator`) and throw `ForbiddenException` (HTTP 403). The authenticated user identity (`userId`, `role`) must always come from the session (`@User()`), never from client input, query parameters, or request bodies.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.
