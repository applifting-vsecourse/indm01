import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// An empty search is the full feed — the server treats it the same way.
export const quacksQueryOptions = (search = "") =>
  queryOptions({
    queryKey: quackKeys.list(search),
    queryFn: async () =>
      quacksSchema.parse(
        await api.get("quacks", { searchParams: search ? { q: search } : undefined }).json(),
      ),
  })
