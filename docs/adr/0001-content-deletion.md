# 0001 · Content Deletion and Tombstones

Status: Accepted · 2026-11-10

## Context

Quacker allows authors and moderators/administrators to delete quacks. With the introduction of threaded replies, a quack may have replies authored by other users. This introduces two competing product requirements:

1. "Replies belong to the people who wrote them: if an author deletes a quack that already has replies, the replies must not disappear with it."
2. "At the same time, when someone deletes their quack, its content has to really disappear from the app."

Previously, deletion performed an unconditional physical `DELETE FROM quack`. In a threaded model, hard-deleting a parent quack either cascades and deletes all downstream replies, or fails if foreign keys restrict deletion. We need a consistent deletion pattern across the entire application that protects replies while guaranteeing that deleted text is purged completely.

## Decision

When a quack that has active replies is deleted:

- The row is retained as a structural tombstone with `deletedAt` set to the current timestamp.
- The content is **scrubbed immediately**: `text` is set to `""`, `mood` is cleared to `null`, and any attached `poll` (with answers and votes) is permanently deleted.
- In the feed, the quack renders as an anonymous tombstone (_"[This quack was deleted]"_), with its replies preserved and viewable beneath it.
- In search and API queries, deleted text never appears because it has been permanently wiped from the database.

When a leaf quack (a reply, or a top-level quack with zero replies) is deleted:

- It is physically hard-deleted from the database via `DELETE FROM quack`.

## Options considered

- **Option 1: Hard delete with cascade (`onDelete: Cascade`)**
  - _Why rejected:_ Deleting a parent quack deletes all replies under it. This violates the core requirement that replies belong to their authors and must not disappear.
- **Option 2: Hard delete with orphan re-pointing (`onDelete: SetNull`)**
  - _Why rejected:_ Setting `parentId = null` promotes replies to top-level quacks in the feed or orphans them without context. This breaks the conversation flow and creates confusing stray messages.
- **Option 3: Standard soft delete without content scrubbing (`deletedAt` only)**
  - _Why rejected:_ Preserving the original text in the database and merely hiding it in queries violates the product and privacy requirement that deleted content must _really_ disappear from the database and the app.

## Consequences

- **Query filtering:** Main feed queries must filter out quacks where `deletedAt IS NOT NULL` unless they have active replies (`replies: { some: { deletedAt: null } }`). Search queries and reply queries must filter out `deletedAt IS NOT NULL`.
- **UI adjustments:** The frontend quack component must support rendering a tombstone state (_"[This quack was deleted]"_) without author identity or actions, while keeping the reply list accessible.
- **Deletion logic:** The `deleteQuack` service method checks for replies: if active replies exist, it scrubs content and sets `deletedAt`; if no replies exist, it performs a hard delete.
