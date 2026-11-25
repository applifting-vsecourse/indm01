# Likes — Cases

Feature request from the product owner:

> "People want to show they like a quack without having to reply. I want a like button and a like count on every quack. Everyone can like a quack only once, and take the like back."

## Product decisions

- **Liking own quacks:** Allowed. Authors can like and unlike their own quacks.
- **Likes on replies:** Allowed. Replies are quacks and support the same like button, count, and likers list as top-level quacks.
- **Deleted / non-existent quacks:** Cannot be liked, unliked, or inspected for likers (`404`). When a quack with replies is deleted into a tombstone (`deletedAt != null`), its existing likes are removed and the tombstone displays no like button or count.
- **Idempotence:** Liking an already-liked quack and unliking a quack that is not liked both succeed without error and leave the like count unchanged (max 1 per user, never below 0).
- **Signed-out visitors:** All like endpoints require authentication and return `401 Unauthorized` when signed out.
- **User interface & "who liked it":** Every active quack and reply displays a like button with a distinct pressed state (`aria-pressed="true"` when liked by the signed-in user, `aria-pressed="false"` otherwise) and the like count (always visible, including `0`). Users can view the list of people who liked a quack from the count.

---

## Rules (unit tests)

### R1 · Liking an active quack

- **Given** an active quack with `0` likes and a signed-in user who has not liked it
- **When** the user likes the quack
- **Then** the like is recorded and the result has `likeCount = 1` and `likedByMe = true`

### R2 · Liking own quack

- **Given** an active quack authored by user A
- **When** user A likes their own quack
- **Then** the like is recorded and `likeCount` increases by `1` with `likedByMe = true`

### R3 · Liking a reply

- **Given** an active reply (`parentId != null`)
- **When** a signed-in user likes the reply
- **Then** the like is recorded and `likeCount` increases by `1` with `likedByMe = true`

### R4 · Liking the same quack twice is idempotent

- **Given** an active quack already liked by user A (`likeCount = 1`)
- **When** user A likes the same quack again
- **Then** no error is thrown, no duplicate like is created, and the result remains `likeCount = 1`, `likedByMe = true`

### R5 · Taking a like back (unlike)

- **Given** an active quack liked by user A (`likeCount = 1`)
- **When** user A unlikes the quack
- **Then** the like is removed and the result has `likeCount = 0` and `likedByMe = false`

### R6 · Unliking a quack not liked by the user is idempotent

- **Given** an active quack with `0` likes (or liked only by user B)
- **When** user A unlikes the quack
- **Then** no error is thrown, user B's like is unaffected, `likeCount` does not change (never drops below `0`), and `likedByMe = false`

### R7 · Liking or unliking a non-existent quack fails

- **Given** no quack exists with id `missing-id`
- **When** a signed-in user likes or unlikes `missing-id`
- **Then** a `NotFoundException` (`404`) is thrown

### R8 · Liking or unliking a deleted tombstone quack fails

- **Given** a quack that was scrubbed into a tombstone (`deletedAt != null`)
- **When** a signed-in user likes or unlikes that quack
- **Then** a `NotFoundException` (`404`) is thrown

### R9 · Listing likers of an active quack

- **Given** an active quack liked by users A and B
- **When** a signed-in user requests the likers of that quack
- **Then** both users (`id`, `name`, `username`) are returned ordered by most recent like first

### R10 · Listing likers of a non-existent or tombstone quack fails

- **Given** a missing quack id or a tombstone quack (`deletedAt != null`)
- **When** a signed-in user requests its likers
- **Then** a `NotFoundException` (`404`) is thrown

### R11 · Tombstone deletion clears likes

- **Given** a quack with replies and existing likes
- **When** the quack is deleted (converted into a tombstone)
- **Then** its likes are deleted as part of scrubbing

---

## API behaviour (integration tests)

### A1 · Signed-out visitors are rejected

- **Given** an unauthenticated request (no session cookie)
- **When** calling `POST /api/quacks/:id/like`, `DELETE /api/quacks/:id/like`, or `GET /api/quacks/:id/likes`
- **Then** every endpoint responds with `401 Unauthorized`

### A2 · Feed includes `likeCount` and `likedByMe`

- **Given** a quack in the database with no likes
- **When** user A calls `GET /api/quacks`
- **Then** the quack includes `likeCount: 0` and `likedByMe: false`

### A3 · Like persists and `likedByMe` is per-user

- **Given** a quack with `0` likes and two signed-in users A and B
- **When** user A calls `POST /api/quacks/:id/like`
- **Then** the response is `200` with `{ likeCount: 1, likedByMe: true }`
- **And** `GET /api/quacks` returns `likeCount: 1, likedByMe: true` for user A and `likeCount: 1, likedByMe: false` for user B

### A4 · Repeated like by the same user is idempotent and enforced by the database

- **Given** user A already liked quack X
- **When** user A calls `POST /api/quacks/:id/like` again
- **Then** the response is `200` with `{ likeCount: 1, likedByMe: true }` and only one like row exists in Postgres

### A5 · Multiple users can like the same quack

- **Given** user A already liked quack X
- **When** user B calls `POST /api/quacks/:id/like`
- **Then** the response is `200` with `{ likeCount: 2, likedByMe: true }`

### A6 · Unlike decrements the count and is idempotent

- **Given** users A and B both liked quack X (`likeCount = 2`)
- **When** user A calls `DELETE /api/quacks/:id/like`
- **Then** the response is `200` with `{ likeCount: 1, likedByMe: false }`
- **When** user A calls `DELETE /api/quacks/:id/like` a second time
- **Then** the response is `200` with `{ likeCount: 1, likedByMe: false }`

### A7 · Author can like their own quack

- **Given** user A created quack X
- **When** user A calls `POST /api/quacks/:id/like`
- **Then** the response is `200` with `{ likeCount: 1, likedByMe: true }`

### A8 · Replies support likes and report `likeCount` / `likedByMe`

- **Given** a reply under quack X
- **When** user A calls `POST /api/quacks/:replyId/like` and then `GET /api/quacks/:id/replies`
- **Then** the reply in the list has `likeCount: 1` and `likedByMe: true`
- **When** user A calls `DELETE /api/quacks/:replyId/like`
- **Then** `GET /api/quacks/:id/replies` shows `likeCount: 0` and `likedByMe: false`

### A9 · Listing who liked a quack

- **Given** user A and then user B liked quack X
- **When** a signed-in user calls `GET /api/quacks/:id/likes`
- **Then** the response is `200` with an array containing user B followed by user A (`id`, `name`, `username`)
- **And** after user B unlikes quack X, `GET /api/quacks/:id/likes` contains only user A

### A10 · Non-existent and deleted tombstone quacks return `404`

- **Given** a non-existent quack id
- **When** a signed-in user calls `POST /api/quacks/:id/like`, `DELETE /api/quacks/:id/like`, or `GET /api/quacks/:id/likes`
- **Then** all three respond with `404`
- **Given** a quack with a reply and a like that is deleted into a tombstone
- **When** a signed-in user calls `POST /api/quacks/:id/like`, `DELETE /api/quacks/:id/like`, or `GET /api/quacks/:id/likes`
- **Then** all three respond with `404`, and `GET /api/quacks` returns the tombstone with `likeCount: 0, likedByMe: false`

---

## End-to-end flows (Playwright)

### E1 · Like, persist across reload, view likers, second user likes, and unlike

- **Given** user A is signed in and posts a new quack
- **When** user A views the quack in `/quacks`
- **Then** the like button shows count `0` and is not pressed (`aria-pressed="false"`)
- **When** user A clicks the like button
- **Then** the count becomes `1` and the button is pressed (`aria-pressed="true"`)
- **When** user A reloads the page
- **Then** the count is still `1` and the button is still pressed
- **When** user B signs in and opens `/quacks`
- **Then** user B sees count `1` with an unpressed like button (`aria-pressed="false"`)
- **When** user B clicks the like button
- **Then** the count becomes `2` and the button is pressed
- **When** user B opens the list of people who liked the quack
- **Then** both user A and user B are shown in the list
- **When** user A clicks the like button again to take the like back
- **Then** the count becomes `1` and user A's button is no longer pressed (`aria-pressed="false"`)

### E2 · Liking and unliking a reply

- **Given** user A posts a quack and user B replies to it
- **When** user A expands replies and clicks the like button on the reply
- **Then** the reply's like count goes from `0` to `1` and the button is pressed
- **When** user A clicks the reply's like button again
- **Then** the reply's like count returns to `0` and the button is unpressed
