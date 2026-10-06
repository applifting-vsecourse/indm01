import { useCallback } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch, SEARCH_MAX_LENGTH } from "@/features/quack/components/QuackSearch"

const quacksSearchParamsSchema = z.object({
  // The router parses `?q=123` as a number, hence the coercion. A hand-edited
  // URL that's too long falls back to the full feed instead of an error page.
  q: z.coerce.string().trim().max(SEARCH_MAX_LENGTH).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
  validateSearch: quacksSearchParamsSchema,
})

function QuacksPage() {
  const { q: search = "" } = Route.useSearch()
  const navigate = Route.useNavigate()
  // Keep the previous results on screen while the next search loads, so the
  // list doesn't blank out on every pause in typing.
  const quacksQuery = useQuery({
    ...quacksQueryOptions(search),
    placeholderData: keepPreviousData,
  })

  const handleSearch = useCallback(
    (next: string) =>
      // replace: typing shouldn't leave a history entry per word
      void navigate({ search: next ? { q: next } : {}, replace: true }),
    [navigate],
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm className="mb-4" />

        <QuackSearch
          value={search}
          onSearch={handleSearch}
          className="mb-4"
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          // Placeholder rows belong to the previous search, so don't let them
          // trigger "no matches" for the new one.
          isLoading={quacksQuery.isLoading || quacksQuery.isPlaceholderData}
          error={quacksQuery.error ?? undefined}
          search={search}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
        />
      </section>
    </>
  )
}
