import { useMutation, useQueryClient } from "@tanstack/react-query"

import { addQuack } from "@/features/quack/api/addQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useAddReply(parentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) =>
      addQuack({
        text,
        parentId,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quackKeys.replies(parentId) }),
        queryClient.invalidateQueries({ queryKey: quackKeys.lists() }),
      ])
    },
  })
}
