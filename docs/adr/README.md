# Architecture Decision Records (ADRs)

| Number                           | Title                            | Status   | Summary                                                                                                                   |
| -------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-content-deletion.md) | Content Deletion and Tombstones  | Accepted | Scrub content and retain a tombstone with `deletedAt` when deleting quacks with replies, while hard-deleting leaf quacks. |
| [0002](0002-likes.md)            | Quack Likes Storage and Counting | Accepted | Store likes in a `QuackLike` join table with `@@unique([quackId, userId])` and compute `likeCount` from rows.             |
