# Story: Moderator / Admin delete quacks

## Who, what, why

**As** an administrator / moderator of Quacker,
**I want** to be able to delete any quack on the platform,
**so that** offensive or inappropriate content can be moderated and removed even when the author refuses to delete it.

## Decisions

All decisions below have been confirmed with the product owner.

| Topic               | Decision                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moderator account   | The moderator is an `admin` user (`role: 'admin'`). The account `admin@example.com` already exists from the seed.                                                 |
| Who can delete      | The quack author can delete their own quack; an `admin` can delete any quack. Regular non-author users cannot delete other people's quacks (HTTP 403 Forbidden).  |
| Confirmation dialog | Same confirmation dialog as for regular authors ("Delete quack? Are you sure you want to delete this quack? This action cannot be undone.").                      |
| Delete button UI    | Standard Delete button on every quack for admins, identical in style and placement to the author's Delete button.                                                 |
| Audit / Logging     | Administrative deletion of someone else's quack logs a structured log line on the backend (`event: 'quack_moderated'` with `adminId`, `quackId`, and `authorId`). |
| Out of scope        | Post-edit moderation reasons/reports, dedicated moderation log UI, soft-delete or undelete.                                                                       |

## Acceptance criteria

1. **Admin sees Delete on every quack:** When signed in as `admin@example.com`, every quack in the feed displays a Delete action.
2. **Regular users only see Delete on their own quacks:** Non-admin users see Delete only on quacks they authored; other people's quacks do not have a Delete action.
3. **Confirmation before delete:** Clicking Delete opens a confirmation modal before the quack is deleted.
4. **Feed updates:** After confirmation, the quack is deleted and immediately disappears from the feed.
5. **API authorization:**
   - An admin can send `DELETE /api/quacks/:id` to any quack and it succeeds (204 No Content).
   - A regular user sending `DELETE /api/quacks/:id` for another user's quack receives 403 Forbidden.
   - An unauthenticated request receives 401 Unauthorized.
