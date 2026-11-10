import { queryOptions } from "@tanstack/react-query"

import { getReplies } from "@/features/quack/api/getReplies"
import { quackKeys } from "@/features/quack/api/quackKeys"

export const repliesQueryOptions = (parentId: string) =>
  queryOptions({
    queryKey: quackKeys.replies(parentId),
    queryFn: () => getReplies(parentId),
  })
