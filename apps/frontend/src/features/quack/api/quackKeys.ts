export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search: string) => [...quackKeys.lists(), { search }] as const,
  replies: (parentId: string) => [...quackKeys.all(), parentId, "replies"] as const,
  likes: (quackId: string) => [...quackKeys.all(), quackId, "likes"] as const,
  likeMutation: (quackId: string) => ["quack-like", quackId] as const,
  // Mutation keys: every vote shares the prefix, so the feed page can tell
  // that "a vote is pending" without knowing which poll it belongs to.
  pollVotes: () => ["poll-vote"] as const,
  pollVote: (pollId: string) => [...quackKeys.pollVotes(), pollId] as const,
}
