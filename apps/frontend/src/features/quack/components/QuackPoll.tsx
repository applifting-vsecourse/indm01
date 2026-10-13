import { Check, Trophy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Poll, PollAnswer } from "@/features/quack/api/quackSchemas"
import { usePollClosed } from "@/features/quack/hooks/usePollClosed"
import { useVote } from "@/features/quack/hooks/useVote"
import {
  formatTimeLeft,
  formatVoteCount,
  getWinnerIds,
  votePercentage,
} from "@/features/quack/lib/pollResults"

type QuackPollProps = {
  quackId: string
  /** The author asked the question, so they only watch the answers come in. */
  authorId: string
  /** The signed-in user. Comes from the page, as features don't import each other. */
  currentUserId?: string
  poll: Poll
}

// Rows are hairline-bordered, not cards: the poll sits inside a quack, which
// is already the card-like item of the list.
const rowClassName =
  "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border border-border px-3 py-2 text-left text-sm"

export function QuackPoll({ quackId, authorId, currentUserId, poll }: QuackPollProps) {
  const { vote, error } = useVote(quackId, poll.id)
  const { isClosed, msLeft } = usePollClosed(poll)

  const canVote = !isClosed && currentUserId !== undefined && currentUserId !== authorId
  const winnerIds = isClosed ? getWinnerIds(poll) : new Set<string>()

  const renderAnswer = (answer: PollAnswer) => {
    const percentage = votePercentage(answer.votes, poll.totalVotes)
    const isMine = answer.id === poll.myAnswerId
    const isWinner = winnerIds.has(answer.id)

    const content = (
      <>
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-secondary"
          style={{ width: `${percentage}%` }}
        />
        <span
          className={cn(
            "relative flex items-center gap-2 break-words",
            isWinner && "font-semibold",
          )}
        >
          {answer.text}
          {isWinner ? (
            <Trophy
              role="img"
              aria-label="Winner"
              className="size-4"
            />
          ) : null}
        </span>
        <span className="relative flex shrink-0 items-center gap-2 text-muted-foreground">
          {`${answer.votes} · ${percentage}%`}
          {isMine ? (
            <Check
              role="img"
              aria-label="Your vote"
              className="size-4 text-foreground"
            />
          ) : null}
        </span>
      </>
    )

    if (!canVote) {
      return (
        <li
          key={answer.id}
          className={rowClassName}
        >
          {content}
        </li>
      )
    }

    return (
      <li key={answer.id}>
        <Button
          type="button"
          variant="outline"
          aria-pressed={isMine}
          aria-label={`${answer.text}, ${formatVoteCount(answer.votes)}, ${percentage}%`}
          // Clicking your own answer takes the vote back.
          onClick={() => vote(isMine ? null : answer.id)}
          className={cn(rowClassName, "h-auto font-normal whitespace-normal")}
        >
          {content}
        </Button>
      </li>
    )
  }

  const total = poll.totalVotes === 0 && isClosed ? "No votes" : formatVoteCount(poll.totalVotes)
  const timeLeft = isClosed ? "Closed" : `Closes in ${formatTimeLeft(msLeft)}`

  return (
    <div className="mt-2 flex flex-col gap-2">
      <ul className="flex flex-col gap-2">{poll.answers.map(renderAnswer)}</ul>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>{`${total} · ${timeLeft}`}</p>
        {canVote && poll.myAnswerId ? <p>Click your answer again to remove your vote.</p> : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
