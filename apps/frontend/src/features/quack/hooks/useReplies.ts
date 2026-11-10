import { useQuery } from "@tanstack/react-query"

import { repliesQueryOptions } from "@/features/quack/api/repliesQueryOptions"

export function useReplies(parentId: string, isEnabled = true) {
  return useQuery({
    ...repliesQueryOptions(parentId),
    enabled: isEnabled,
  })
}
