# Story: Quack Replies & Deletion Pattern

## Who, what, why

**As** a Quacker user,
**I want** to post replies directly under a quack and read other people's replies in a conversation thread,
**so that** discussions stay organized and everyone can tell what anyone is replying to.

**As** an author of a quack with replies,
**I want** to be able to delete my quack without destroying other people's replies,
**so that** my words disappear completely from the app while respecting the ownership of the replies people wrote.

---

## Decisions

All decisions below were evaluated with trade-offs and confirmed during the design interview.

| Decision                           | Chosen Option                                                | Options Rejected & Why                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data model structure**           | **Unified `Quack` model (`parentId: String?`)**              | **Rejected: Separate `QuackReply` table.** A separate table would duplicate user relations, timestamps, text handling, and DTOs. It would also make future thread nesting or feature parity require migrations and redesigns. Unified `Quack` reuses existing infrastructure cleanly.                                                                             |
| **Deletion behavior**              | **Tombstone with scrubbed content (`deletedAt: DateTime?`)** | **Rejected 1: Pure hard delete (`onDelete: SetNull`).** Setting parent to null orphans replies, scattering them across the main feed and losing all conversation context.<br>**Rejected 2: Soft delete without scrubbing.** Keeping the author's text in the DB violates the strict product and privacy requirement that deleted content must _really_ disappear. |
| **Threading depth & capabilities** | **Flat replies, text-only**                                  | **Rejected: Deeply nested recursive reply trees with polls/moods.** Over-engineers the MVP, clutters mobile feed UI with deep indentation, and adds unnecessary complexity. Storing `parentId` on `Quack` leaves the door open to nested replies later without schema migrations.                                                                                 |
| **UI display**                     | **Inline expandable replies in feed + feed tombstone**       | **Rejected: Dedicated page-only thread route (`/quacks/:id`).** Forces full page navigations to read brief exchanges, adding friction. Inline expansion fits Quacker's single-page feed architecture smoothly.                                                                                                                                                    |
| **Data fetching**                  | **Lazy loading (`GET /api/quacks/:id/replies`)**             | **Rejected: Eagerly bundling all replies into `GET /api/quacks`.** Causes response payload bloat as conversations grow and slows down feed load times.                                                                                                                                                                                                            |
| **Reply count**                    | **Computed count (`_count.replies`)**                        | **Rejected: Stored counter column (`replyCount: Int`).** CLAUDE.md convention: computed counts beat stored counters because stored counters drift on concurrent writes and deletes.                                                                                                                                                                               |

---

## Acceptance criteria

### 1. Viewing Replies & Counts in Feed

1. Every top-level quack in the feed displays a reply counter (e.g., `💬 0` or `💬 3 replies`) and a reply action.
2. Clicking the reply action expands the inline replies section under the quack card.
3. Expanding fetches `GET /api/quacks/:id/replies` lazily.
4. Replies are displayed chronologically (oldest first), showing the author's avatar/name, handle `@username`, relative timestamp, and text content.

### 2. Posting Replies

1. The expanded section includes a reply input form with a "Reply" submit button.
2. Submitting a reply sends `POST /api/quacks` with `{ text, parentId }`.
3. Replies are restricted to text: providing `poll` or `mood` with a `parentId` is rejected with HTTP 400 Bad Request.
4. Replying to a reply (nested threading) is rejected with HTTP 400 Bad Request.
5. On successful creation, the new reply immediately appears in the thread, and the parent's reply count increments.

### 3. Deleting Quacks & Replies

1. **Quack with replies:**
   - When an author (or admin) deletes a quack that has active replies, its `text` is scrubbed (`""`), `mood` is cleared, poll is removed, and `deletedAt` is set to `now()`.
   - The card in the feed renders a tombstone indicator (_"[This quack was deleted]"_), hiding author info.
   - Its original text is scrubbed from the database and **never** appears anywhere (not in feed, not in search results, not in replies).
   - Its replies remain intact, visible, and expandable underneath the tombstone.
2. **Quack without replies:**
   - When deleted, the quack is removed completely (hard delete or omitted from UI/queries). It leaves no tombstone card in the feed.
3. **Deleting a reply:**
   - The author of a reply (or an admin) can delete their reply.
   - The deleted reply is purged, disappears from the thread, and the parent's reply count decrements.
   - Non-authors cannot delete others' replies (HTTP 403 Forbidden).

---

## Proposed Schema Changes (`schema.prisma`)

```prisma
model Quack {
  id        String     @id @default(cuid())
  text      String     @db.Text
  mood      QuackMood?
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt
  poll      Poll?

  // Self-referencing relation for replies
  parentId  String?
  parent    Quack?     @relation("QuackReplies", fields: [parentId], references: [id], onDelete: Restrict)
  replies   Quack[]    @relation("QuackReplies")

  // Soft-delete marker for tombstones preserving thread structure
  deletedAt DateTime?

  @@index([userId])
  @@index([parentId])
  @@index([deletedAt])
  @@map("quack")
}
```
