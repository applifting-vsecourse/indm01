import { useState } from "react"
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { castVote, removeVote } from "@/features/quack/api/vote"
import { applyVote } from "@/features/quack/lib/pollResults"

export const VOTE_FAILED_MESSAGE = "Your vote didn't go through. Try again."
export const POLL_CLOSED_MESSAGE = "This poll has closed."

type Snapshot = ReturnType<QueryClient["getQueriesData"]>

// The server answers 409 for a poll whose deadline has passed.
const isConflict = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  (error as { response?: { status?: number } }).response?.status === 409

// A poll appears in every cached feed (one per search), so update all of them.
function updatePoll(queryClient: QueryClient, quackId: string, update: (poll: Poll) => Poll): void {
  queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
    quacks?.map((quack) =>
      quack.id === quackId && quack.poll ? { ...quack, poll: update(quack.poll) } : quack,
    ),
  )
}

/**
 * Casts, moves or removes the signed-in user's vote (`null` removes it). The
 * vote shows immediately; if the server refuses it, the poll goes back to how
 * it was and `error` says so until the next attempt.
 */
export function useVote(quackId: string, pollId: string) {
  const queryClient = useQueryClient()
  const mutationKey = quackKeys.pollVote(pollId)
  const [error, setError] = useState<string | null>(null)

  // Several clicks in a row queue up (see `scope`). Only the last one may
  // overwrite the cache with server numbers, otherwise the response to the
  // first click would undo the optimistic state of the second.
  const isLastPendingVote = () => queryClient.isMutating({ mutationKey }) === 1

  const mutation = useMutation<Poll, Error, string | null, { snapshot: Snapshot }>({
    mutationKey,
    scope: { id: pollId },
    mutationFn: (answerId) => (answerId ? castVote(quackId, answerId) : removeVote(quackId)),
    onMutate: async (answerId) => {
      setError(null)
      // Stops a refetch that is already running from landing on top of the vote.
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      const snapshot = queryClient.getQueriesData({ queryKey: quackKeys.lists() })
      updatePoll(queryClient, quackId, (poll) => applyVote(poll, answerId))
      return { snapshot }
    },
    onSuccess: (poll) => {
      if (isLastPendingVote()) updatePoll(queryClient, quackId, () => poll)
    },
    onError: (voteError, _answerId, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
      if (isConflict(voteError)) {
        updatePoll(queryClient, quackId, (poll) => ({ ...poll, isClosed: true }))
        setError(POLL_CLOSED_MESSAGE)
      } else {
        setError(VOTE_FAILED_MESSAGE)
      }
    },
    onSettled: async () => {
      if (isLastPendingVote()) await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })

  return { vote: mutation.mutate, error }
}
