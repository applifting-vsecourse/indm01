import type { Poll } from "@/features/quack/api/quackSchemas"

const MINUTE_MS = 60_000

// Whole-number percentages can add up to 99 or 101. The counts are exact.
export function votePercentage(votes: number, totalVotes: number): number {
  return totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)
}

/** Every answer tied for the most votes. Nobody wins a poll nobody voted in. */
export function getWinnerIds(poll: Poll): Set<string> {
  const mostVotes = Math.max(0, ...poll.answers.map((answer) => answer.votes))
  if (mostVotes === 0) return new Set()
  return new Set(poll.answers.filter((answer) => answer.votes === mostVotes).map((a) => a.id))
}

/**
 * The largest unit that fits, rounded up: up to 60 minutes `N min`, up to
 * 24 hours `N h`, beyond that `N d`. With only seconds left it reads `1 min`.
 */
export function formatTimeLeft(msLeft: number): string {
  const minutes = Math.max(1, Math.ceil(msLeft / MINUTE_MS))
  if (minutes <= 60) return `${minutes} min`
  const hours = Math.ceil(minutes / 60)
  if (hours <= 24) return `${hours} h`
  return `${Math.ceil(hours / 24)} d`
}

export function formatVoteCount(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`
}

/**
 * What the poll looks like once `answerId` is the user's vote (null removes it).
 * Used for the optimistic update; the server's numbers replace it afterwards.
 */
export function applyVote(poll: Poll, answerId: string | null): Poll {
  if (poll.myAnswerId === answerId) return poll

  return {
    ...poll,
    myAnswerId: answerId,
    totalVotes: poll.totalVotes + (answerId ? 1 : 0) - (poll.myAnswerId ? 1 : 0),
    answers: poll.answers.map((answer) => {
      if (answer.id === answerId) return { ...answer, votes: answer.votes + 1 }
      if (answer.id === poll.myAnswerId) return { ...answer, votes: answer.votes - 1 }
      return answer
    }),
  }
}
