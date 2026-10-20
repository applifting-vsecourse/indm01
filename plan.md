# Plan: Polls on quacks

Implements [`story.md`](story.md). Section numbers like "AC 12" refer to its acceptance criteria.

## Approach in one paragraph

A poll belongs to a quack, so it lives in the existing `quack` module rather than a new one: the quack is created together with its poll in one transaction, and the poll comes back as a nullable `poll` field on every quack in `GET /api/quacks`. Votes are rows, never counters — counts are computed on read, so concurrent votes can't make them drift, and the database itself enforces "one person, one vote" and "a vote belongs to an answer of the same poll". Voting gets its own small controller and service. The frontend renders the poll inside `QuackItem`, votes optimistically, and refetches the feed every 15 s.

## Data model

One migration, `add_polls`, via `pnpm backend prisma:migrations:run`.

```prisma
model Poll {
  id        String       @id @default(cuid())
  quack     Quack        @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String       @unique
  closesAt  DateTime
  createdAt DateTime     @default(now())
  answers   PollAnswer[]
  votes     PollVote[]

  @@map("poll")
}

model PollAnswer {
  id       String     @id @default(cuid())
  poll     Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId   String
  text     String     @db.VarChar(50)
  position Int
  votes    PollVote[]

  @@unique([pollId, position])
  // Target for PollVote's compound foreign key below.
  @@unique([id, pollId])
  @@map("poll_answer")
}

model PollVote {
  id        String     @id @default(cuid())
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId    String
  // Compound FK: the database refuses a vote whose answer belongs to another poll.
  answer    PollAnswer @relation(fields: [answerId, pollId], references: [id, pollId], onDelete: Cascade)
  answerId  String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  // One person, one vote — enforced by the database, not just the service.
  @@unique([pollId, userId])
  @@index([answerId])
  @@index([userId])
  @@map("poll_vote")
}
```

Plus back-relations: `Quack.poll Poll?` and `User.pollVotes PollVote[]`.

How the tables link (every link cascades on delete):

- `Quack` 1 — 0..1 `Poll`: a quack has at most one poll, and `Poll.quackId` is unique.
- `Poll` 1 — 2..4 `PollAnswer`.
- `Poll` 1 — 0..n `PollVote`, and `PollAnswer` 1 — 0..n `PollVote`. A vote links to both, and the two links are tied together by the compound foreign key `(answerId, pollId)`.
- `User` 1 — 0..n `PollVote`, and `@@unique([pollId, userId])` limits each user to one vote per poll.

What the database guarantees, and what only the service does:

| Rule                                             | Enforced by                             |
| ------------------------------------------------ | --------------------------------------- |
| One vote per person per poll                     | Database (`@@unique([pollId, userId])`) |
| A vote's answer belongs to the vote's poll       | Database (compound foreign key)         |
| One poll per quack, answer order unique          | Database (unique indexes)               |
| Answer text ≤ 50 characters                      | Database (`VarChar(50)`) and DTO        |
| 2–4 answers, non-empty after trim                | DTO only                                |
| No duplicate answers (case-insensitive, trimmed) | Service only                            |
| Author can't vote, closed polls take no votes    | Service only                            |

The service-only rules are deliberately not pushed into the database. Duplicate answers would need an expression index (`lower(btrim(text))`) that Prisma can't declare, so every `migrate dev` would try to drop it. There is a single write path (`createQuack`), so the service check is enough for a first version. Deleting a user cascades to their votes, so their votes disappear from the counts; there is no user-deletion feature today, so this is accepted.

Why this shape:

- **No stored counts.** `votes` per answer is `_count` of `PollVote`, `totalVotes` is their sum. Two people voting at the same moment insert two rows — nothing to race on (AC 18).
- **`@@unique([pollId, userId])`** makes "one vote" a database guarantee; changing a vote is an update of the same row, removing it a delete (AC 14, 15).
- **Compound FK `(answerId, pollId)`** means a vote can never point at another poll's answer, even if the service check were wrong.
- **`closesAt`, not a duration.** The server computes it once at creation; closed is simply `closesAt <= now`. No job or status column.
- **`position`** keeps answers in the order the author typed them.
- **`updatedAt` on votes** feeds the "how many people changed their mind" metric.

Domain types (`domain/quack.ts`):

```ts
export const POLL_DURATIONS = ['1h', '1d', '1w'] as const;
export type PollDuration = (typeof POLL_DURATIONS)[number];

export type PollAnswer = { id: string; text: string; votes: number };
export type Poll = {
  id: string;
  closesAt: Date;
  isClosed: boolean; // decided by the server's clock when the response is built
  totalVotes: number;
  myAnswerId: string | null; // the requesting user's vote
  answers: PollAnswer[]; // ordered by position
};
// Quack gains: poll: Poll | null
```

## Endpoints

All under the existing `AuthenticatedUserGuard`; the user always comes from the session. Documented in Swagger.

### `POST /api/quacks` — extended

```jsonc
{
  "text": "Where do we go for lunch?",
  "mood": null,
  "poll": { "answers": ["Pizza", "Thai", "Salad"], "duration": "1d" }, // optional
}
```

- `CreatePollDto` nested with `@IsOptional() @ValidateNested() @Type(() => CreatePollDto)` — required because the controller's `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted`.
- `answers`: `@IsArray() @ArrayMinSize(2) @ArrayMaxSize(4)`, each `@IsString()`, trimmed via `@Transform`, then `@IsNotEmpty() @MaxLength(50)`.
- `duration`: `@IsIn(POLL_DURATIONS)`.
- Service: rejects duplicates (trimmed, lower-cased) with `400`; computes `closesAt = now + duration`.
- Repository: quack + poll + answers in one nested `create` (one transaction).
- `201` returns the quack with `poll` (0 votes, `myAnswerId: null`).

### `GET /api/quacks` — extended

Each quack gains `poll`:

```jsonc
"poll": {
  "id": "…",
  "closesAt": "2026-10-14T12:00:00.000Z",
  "isClosed": false,          // server clock; the client also closes at closesAt on its own clock
  "totalVotes": 10,
  "myAnswerId": "…",          // or null
  "answers": [{ "id": "…", "text": "Pizza", "votes": 5 }, …]
} // or null for a plain quack
```

One query, no N+1: `include: { poll: { include: { answers: { orderBy: { position: 'asc' }, include: { _count: { select: { votes: true } } } }, votes: { where: { userId: viewerId }, select: { answerId: true } } } } }`. `getQuacks` therefore takes the viewer's id.

Search: a fourth branch in the per-word `OR` — `{ poll: { answers: { some: { text: { contains: word, mode: 'insensitive' } } } } }` — using the existing `escapeLikePattern` (AC 28).

### `PUT /api/quacks/:quackId/poll/vote` — cast or move a vote

Body `{ "answerId": "…" }`. Upsert on `(pollId, userId)`. Idempotent: voting for your current answer again is a no-op `200`. Returns `200` with the updated `poll` object so the client can reconcile with exact counts.

### `DELETE /api/quacks/:quackId/poll/vote` — remove your vote

Deletes your row if there is one. Idempotent. Returns `200` with the updated `poll`.

The frontend decides between PUT and DELETE (click on your current answer → DELETE); the server doesn't toggle, so a retried request can't flip a vote back.

### Errors (both vote endpoints)

| Status | When                                                |
| ------ | --------------------------------------------------- |
| `400`  | `answerId` missing or not an answer of this poll    |
| `401`  | Not signed in                                       |
| `403`  | Voter is the quack's author                         |
| `404`  | No such quack, or the quack has no poll             |
| `409`  | `closesAt <= now` — message `This poll has closed.` |

The service reads the poll (author, `closesAt`, answer ids) and writes inside one `$transaction`. If two requests from the same user race the upsert and one hits a unique violation (`P2002`), retry once — the second attempt finds the row and updates it.

## Backend structure

Inside `apps/backend/src/modules/quack/`:

| File                                         | Change                                                                |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `domain/quack.ts`                            | `Poll`, `PollAnswer`, `POLL_DURATIONS`; `Quack.poll`                  |
| `repositories/quack.repository.ts`           | create with poll, include poll in reads, search answer text, map poll |
| `repositories/poll.repository.ts` (new)      | `findPollByQuackId`, `upsertVote`, `deleteVote`, `getPollForViewer`   |
| `services/quacks.service.ts`                 | duplicate check, `closesAt`, pass viewer id                           |
| `services/poll-votes.service.ts` (new)       | vote / unvote rules and errors                                        |
| `controllers/dto/create-quack.dto.ts`        | nested `CreatePollDto`                                                |
| `controllers/dto/poll.response.dto.ts` (new) | `PollResponseDto`, used by `QuackResponseDto` and the vote endpoints  |
| `controllers/dto/vote.dto.ts` (new)          | `{ answerId }`                                                        |
| `controllers/poll-votes.controller.ts` (new) | `PUT` / `DELETE /quacks/:quackId/poll/vote`                           |
| `quack.module.ts`                            | register the new controller, service and repository                   |

Seed (`scripts/seed/seed/seed-database.ts`): no change to the `TRUNCATE` is needed — it already uses `CASCADE`, which empties the tables that reference `quack` and `user`. Create one open poll (closes in 1 day) and one closed poll with a tie, each with votes from several seed users. Note that the seed skips a database that already has users — the dev database only gets these after `pnpm backend db:reset`, so during development create polls through the UI or Swagger instead.

## Frontend structure

Inside `apps/frontend/src/features/quack/`:

| File                             | Change                                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/quackSchemas.ts`            | `pollSchema`, `quackSchema.poll: pollSchema.nullable()`                                                                                                                                                                                                   |
| `api/addQuack.ts`                | optional `poll` in the payload                                                                                                                                                                                                                            |
| `api/vote.ts` (new)              | `castVote(quackId, answerId)`, `removeVote(quackId)` — both parse the returned poll                                                                                                                                                                       |
| `api/quacksQueryOptions.ts`      | none — the 15 s `refetchInterval` is set in the page, paused while a vote is pending (see `useVote`)                                                                                                                                                      |
| `lib/pollResults.ts` (new)       | pure: percentages, winners (all tied leaders, none at 0 votes), `formatTimeLeft`, and `applyVote(poll, answerId \| null)` for optimistic updates                                                                                                          |
| `hooks/useVote.ts` (new)         | optimistic mutation — see below                                                                                                                                                                                                                           |
| `hooks/usePollClosed.ts` (new)   | `poll.isClosed \|\| now >= closesAt`; a `setTimeout` to the deadline flips it, a 1-minute interval re-renders the countdown. A `409` also marks the poll closed locally (see `useVote`) — the client clock alone can't, which is the whole point of AC 27 |
| `components/QuackPoll.tsx` (new) | answers, bars, footer, hint, error, closed + winner, author view                                                                                                                                                                                          |
| `components/QuackItem.tsx`       | render `QuackPoll` under the text when `quack.poll`                                                                                                                                                                                                       |
| `components/QuackForm.tsx`       | "Add poll" fields with `useFieldArray`, zod rules mirroring the DTO                                                                                                                                                                                       |

`useVote(quackId, pollId)`:

All vote mutations share `mutationKey: ['poll-vote', pollId]` and `scope: { id: pollId }` — rapid clicks run in order, the last one wins.

1. `onMutate`: `cancelQueries(quackKeys.lists())`; snapshot; `setQueriesData` on every cached list with `applyVote`.
2. `onSuccess`: write the server's `poll` into the cached lists **only when no other vote on this poll is pending** (`queryClient.isMutating({ mutationKey }) === 1`). Otherwise the first response would overwrite the optimistic state of a queued second click and the counts would flicker backwards.
3. `onError`: restore the snapshot; for `409` show `This poll has closed.` and mark the poll closed locally, otherwise `Your vote didn't go through. Try again.`
4. `onSettled`: invalidate `quackKeys.all()`, again only for the last pending vote on the poll (TanStack's documented pattern for concurrent optimistic updates).

`cancelQueries` only cancels a fetch that is already in flight. A refetch that _starts_ after `onMutate` but before the server has committed the vote (the 15 s interval, or a window-focus refetch) would return the old counts and wipe the optimistic state. So the page turns the interval off while a vote is pending: `refetchInterval: useIsMutating({ mutationKey: ['poll-vote'] }) > 0 ? false : 15_000`. It lives in the page, not in `quacksQueryOptions`, because it needs the hook.

Kit components only (`Button`, `Input`, `Select`); no new shadcn components needed. No shadows, no card or border around the poll (DESIGN.md). Bars are `aria-hidden` divs with `bg-secondary`; the trophy is a lucide icon with `aria-label="Winner"`.

## Build order

Each step ends with `pnpm check-all` green and is its own commit. Existing quacks return `poll: null`, so the feed keeps working after every step.

0. **Give this worktree its own database.** The shared dev database almost certainly already has the uncommitted `20261013145700_add_user_settings` migration from the main checkout (`pnpm dev` runs `migrate` on every start), and this worktree's `prisma/migrations/` doesn't contain it. `prisma migrate dev` (`prisma:migrations:run`) would see an applied migration missing from disk, call it drift, and offer to **reset the database** — wiping the running app's data. So, from this worktree:

- Run `pnpm install`. The worktree has no `node_modules`, so tests, type-check and the Prisma CLI don't work until it does. Then `pnpm backend prisma:generate`.
- The dev Postgres is already running (`postgres:17-alpine`, `localhost:5433`, user, password and database all `quacker`, from `apps/backend/docker-compose.yml`). Don't start it again. Find its container with `docker ps` and run `docker exec <container> psql -U quacker -d quacker -c "CREATE DATABASE quacker_polls"`. The user is the image's superuser, so Prisma can also create its shadow database.
- Copy `apps/backend/.env.example` to `apps/backend/.env` (the worktree has no `.env`) and set `DATABASE_URL=postgresql://quacker:quacker@localhost:5433/quacker_polls`. Also change `PORT` to something other than `4050`, in case the backend is ever started from here. `.env` is gitignored.
- Run every migration and seed from here against `quacker_polls` only. Never run `migrate dev` or `db:reset` against the `quacker` database.

1. **Schema and migration.** Prisma models, migration, domain types. Nothing else changes yet.
   _Check:_ generate with `prisma:migrations:generate` (`--create-only`) and **read the SQL before applying it**: the `poll_vote` table must have the composite foreign key `("answerId", "pollId") → poll_answer ("id", "pollId")` with `ON DELETE CASCADE`, plus the unique index on `("pollId", "userId")`. (`prisma validate` accepts the schema, including the two relations that share `pollId`, but the generated SQL hasn't been inspected yet.) Apply to the worktree database; `check-all` passes.

2. **Create and read polls (backend).** Nested DTO, duplicate check, `closesAt`, transactional create, `poll` in `GET /api/quacks` with counts and `myAnswerId`.
   _Tests:_ duplicates → `400`; `closesAt` per duration; plain quack → `poll: null`; mapper sums `totalVotes`.
   _Check:_ create a poll in Swagger and see it in `GET /api/quacks`.

3. **Voting (backend).** `PollRepository`, `PollVotesService`, controller, all error cases.
   _Tests:_ cast, move, remove, idempotent repeat, author `403`, closed `409`, foreign answer `400`, missing poll `404`.
   _Check:_ in Swagger as two different seed users, vote on one poll and confirm both see the same counts.
   _Database check (once, by hand):_ the unit tests mock Prisma, so they can't prove the database rules. Against `quacker_polls`, with `psql`, try to insert (a) a second `poll_vote` row for the same `(pollId, userId)` and (b) a vote whose `answerId` belongs to a different poll. Both must be rejected (unique violation and foreign-key violation). Without this, "one vote per person is enforced by the database" is a claim, not a fact.

4. **Search answer text (backend).** One more `OR` branch.
   _Check:_ per CLAUDE.md, search the dev database once for an answer word and for `%`.

5. **Show polls (frontend, read-only).** Schema, `pollResults` helpers, `usePollClosed`, `QuackPoll` without click handlers: bars, counts, footer, countdown, closed state, winners, author view.
   _Tests:_ `pollResults` (percentages, ties, zero votes; time-left per the story's "Time left" rule, including its boundaries: 30 s → `1 min`, 60 min → `60 min`, 61 min → `2 h`, 24 h → `24 h`, 25 h → `2 d`, 168 h → `7 d`); `QuackPoll` rendering for open, closed, tie, no votes, author.
   _Covers:_ AC 9–11, 19, 22–26.

6. **Vote (frontend).** `vote.ts`, `useVote`, click handlers, hint, error message, 15 s refetch.
   _Tests:_ optimistic update, rollback and message on error, `409` message, move and remove, message clears on next attempt.
   _Covers:_ AC 12–18, 20–21, 27, 29–30.

7. **Create polls (frontend).** Poll fields in `QuackForm`.
   _Tests:_ add/remove answer limits, empty answer, duplicates, payload sent with and without poll, form resets after posting.
   _Covers:_ AC 1–8.

8. **Seed and walkthrough.** Seed polls; walk the acceptance criteria in the browser with two users; AC 28 (search). CLAUDE.md says the app is already running and must not be started a second time, but the running instance serves the main checkout's code, not this worktree's. So this step needs the user's call: either they check out this branch in the main checkout (and point it at a database that has the migration), or they approve running a second instance from the worktree on other ports and the separate database from step 0. Until then, the unit tests are the only evidence.

Steps 2–4 are the backend and could ship as one PR, 5–7 as a second. Splitting this way lets the API be reviewed before any UI depends on it.

## Risks and notes

- **Upsert race.** Prisma only uses native `ON CONFLICT` for upsert in some cases; the `P2002` retry in step 3 covers the rest. A test should mock the first call failing with `P2002`.
- **Clock skew.** The client closes the poll on its own clock, so a client that is fast shows "Closed" a little early, and a slow one keeps showing buttons after the deadline. The server is the authority: it returns `isClosed` and answers a late vote with `409`, and the client turns that into a closed poll (AC 27). The countdown text itself can still be a few minutes off on a badly wrong clock; accepted for a first version.
- **Parallel work in the main checkout.** The uncommitted "user settings" work adds `bio` and `defaultMood` to `User` and touches the same `User` model and `prisma/migrations/`. The two migrations are independent SQL, so either order applies, and the edits to `schema.prisma` are on different lines. A `defaultMood` setting will probably prefill the mood in `QuackForm.tsx`, which step 7 also edits, so expect a merge conflict there. Whichever branch merges second rebases.
- **Percent rounding.** Whole-number percentages may sum to 99 or 101. Counts are exact; the story accepts this.
- **15 s refetch cost.** One feed query every 15 s per open tab, with the vote include. Fine at this size; revisit with paging if the feed grows.
- **Seed doesn't rerun** on a populated database — see the seed note above.
