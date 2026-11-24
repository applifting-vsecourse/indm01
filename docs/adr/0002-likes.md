# 0002 · Quack Likes Storage and Counting

Status: Accepted · 2026-11-24

## Context

Quacker is adding likes so users can react to any active quack (including their own quacks and replies) without having to write a reply. Per [cases.md](../../cases.md), the feature requires:

1. A like button and like count on every active quack and reply.
2. Each user can like a given quack at most once, and can take the like back (both operations idempotent).
3. Knowing whether the signed-in user has liked each quack (`likedByMe`).
4. Listing the users who liked a quack ("who liked it"), ordered most recent first.
5. Scrubbing likes when a parent quack is converted into a tombstone (`deletedAt != null`), and removing likes when a quack or user is hard-deleted.

We need a data model that enforces the one-like-per-user invariant reliably under concurrent requests while keeping counts accurate and supporting all read queries cleanly.

## Decision

Store likes in a dedicated `QuackLike` join table (`quack_like`) and compute counts from the rows rather than storing a denormalized counter on `Quack`:

```prisma
model QuackLike {
  id        String   @id @default(cuid())
  quack     Quack    @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime @default(now())

  @@unique([quackId, userId])
  @@index([quackId, createdAt])
  @@index([userId])
  @@map("quack_like")
}
```

- **Uniqueness in the database:** `@@unique([quackId, userId])` guarantees at most one like per user per quack even under concurrent requests (consistent with `PollVote` and `CLAUDE.md`).
- **Computed counts & `likedByMe`:** Feed and reply queries compute `likeCount` via Prisma `_count.likes` and `likedByMe` via a filtered `likes` lookup for the requesting user's `id`.
- **Who liked it:** `GET /api/quacks/:id/likes` queries `quack_like` filtered by `quackId`, joining `user` (`id`, `name`, `username`), ordered by `createdAt DESC`.
- **Deletion & tombstones:** Hard-deleting a leaf quack or a user cascades automatically via `onDelete: Cascade`. Converting a quack with replies into a tombstone explicitly deletes its `QuackLike` rows inside the same transaction as scrubbing `text`/`mood`/`poll`.

## Options considered

- **Option 1: Separate `QuackLike` table with `@@unique([quackId, userId])` and computed counts (chosen)**
  - _Why chosen:_ Enforces uniqueness in Postgres, eliminates counter drift, natively supports `likedByMe`, replies, and the "who liked it" list, and leaves the door open to add caching later if scale ever requires it.
- **Option 2: Counter column (`likeCount`) on `Quack` without a join table**
  - _Why rejected:_ Cannot enforce "at most one like per user per quack", cannot compute `likedByMe`, and cannot list who liked a quack. Backfilling per-user like history later would be impossible.
- **Option 3: `QuackLike` table plus a denormalized `likeCount` column on `Quack`**
  - _Why rejected:_ Introduces counter drift risk across every write path (like, unlike, tombstone scrub, and cascading user deletion via `onDelete: Cascade`). Keeping the counter in sync requires extra transaction/trigger complexity that is unnecessary at Quacker's current scale.

## Consequences

- **Schema & migration:** Adds the `quack_like` table with foreign keys to `quack` and `user`, a unique constraint on `(quackId, userId)`, and indexes on `(quackId, createdAt)` and `(userId)`.
- **Idempotent writes:** Liking uses an idempotent write (e.g. `createMany` with `skipDuplicates: true` or `upsert`), and unliking uses `deleteMany({ where: { quackId, userId } })` so repeated calls succeed without error.
- **Query shape:** `QuackRepository` includes `_count.likes` and the current user's like existence when loading feed quacks and replies; tombstone scrubbing deletes `quackLike` rows for the scrubbed quack.
- **Future scalability:** If aggregate counts ever become a bottleneck, a cached counter or materialized view can be added later without losing or migrating any like records.
