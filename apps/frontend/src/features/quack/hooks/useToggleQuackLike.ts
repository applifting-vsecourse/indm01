import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { likeQuack, unlikeQuack } from "@/features/quack/api/likes"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack, QuackLikeStatus } from "@/features/quack/api/quackSchemas"

type Snapshot = ReturnType<QueryClient["getQueriesData"]>

function updateQuackLikeInCache(
  queryClient: QueryClient,
  quackId: string,
  parentId: string | null | undefined,
  updater: (quack: Quack) => QuackLikeStatus,
): void {
  const queryKey = parentId ? quackKeys.replies(parentId) : quackKeys.lists()
  queryClient.setQueriesData<Quack[]>({ queryKey }, (quacks) =>
    quacks?.map((quack) => {
      if (quack.id !== quackId) return quack
      const next = updater(quack)
      return {
        ...quack,
        likeCount: next.likeCount,
        likedByMe: next.likedByMe,
      }
    }),
  )
}

export type QuackLikeAction = "like" | "unlike"

export function useToggleQuackLike(quackId: string, parentId?: string | null) {
  const queryClient = useQueryClient()
  const mutationKey = quackKeys.likeMutation(quackId)
  const targetQueryKey = parentId ? quackKeys.replies(parentId) : quackKeys.lists()

  const isLastPending = () => queryClient.isMutating({ mutationKey }) === 1

  return useMutation<QuackLikeStatus, Error, QuackLikeAction, { snapshot: Snapshot }>({
    mutationKey,
    scope: { id: `like-${quackId}` },
    mutationFn: (action) => (action === "like" ? likeQuack(quackId) : unlikeQuack(quackId)),
    onMutate: async (action) => {
      const shouldLike = action === "like"
      await queryClient.cancelQueries({ queryKey: targetQueryKey })
      const snapshot = queryClient.getQueriesData({ queryKey: targetQueryKey })

      updateQuackLikeInCache(queryClient, quackId, parentId, (quack) => {
        const currentCount = quack.likeCount ?? 0
        const isCurrentlyLiked = quack.likedByMe ?? false
        if (isCurrentlyLiked === shouldLike) {
          return { likeCount: currentCount, likedByMe: isCurrentlyLiked }
        }
        return {
          likeCount: Math.max(0, currentCount + (shouldLike ? 1 : -1)),
          likedByMe: shouldLike,
        }
      })

      return { snapshot }
    },
    onSuccess: (status) => {
      if (isLastPending()) {
        updateQuackLikeInCache(queryClient, quackId, parentId, () => status)
      }
    },
    onError: (_error, _action, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async () => {
      if (isLastPending()) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: targetQueryKey }),
          queryClient.invalidateQueries({ queryKey: quackKeys.likes(quackId) }),
        ])
      }
    },
  })
}
