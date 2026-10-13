import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { castVote, removeVote } from "@/features/quack/api/vote"
import { POLL_CLOSED_MESSAGE, useVote, VOTE_FAILED_MESSAGE } from "@/features/quack/hooks/useVote"

vi.mock("@/features/quack/api/vote", () => ({ castVote: vi.fn(), removeVote: vi.fn() }))

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  closesAt: new Date("2099-01-01T12:00:00Z"),
  isClosed: false,
  totalVotes: 10,
  myAnswerId: null,
  answers: [
    { id: "a1", text: "Pizza", votes: 5 },
    { id: "a2", text: "Thai", votes: 3 },
    { id: "a3", text: "Salad", votes: 2 },
  ],
  ...overrides,
})

const quack = (pollValue: Poll): Quack => ({
  id: "q1",
  text: "Where do we go for lunch?",
  mood: null,
  userId: "author",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "author", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: pollValue,
})

// A promise the test settles by hand, to look at the screen while a vote is in flight.
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const setup = (initial: Poll = poll()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // The feed is cached once per search, so seed two of them.
  queryClient.setQueryData(quackKeys.list(""), [quack(initial)])
  queryClient.setQueryData(quackKeys.list("lunch"), [quack(initial)])

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useVote("q1", "p1"), { wrapper })

  const cached = (search = ""): Poll => {
    const cachedPoll = queryClient.getQueryData<Quack[]>(quackKeys.list(search))?.[0]?.poll
    if (!cachedPoll) throw new Error(`No poll in the cached feed for "${search}"`)
    return cachedPoll
  }

  return { result, cached }
}

const votes = (value: Poll) => value.answers.map((answer) => answer.votes)

describe("useVote", () => {
  beforeEach(() => {
    vi.mocked(castVote).mockReset()
    vi.mocked(removeVote).mockReset()
  })

  it("shows the vote before the server answers, in every cached feed", async () => {
    const request = deferred<Poll>()
    vi.mocked(castVote).mockReturnValue(request.promise)
    const { result, cached } = setup()

    act(() => result.current.vote("a2"))

    await waitFor(() => expect(cached().myAnswerId).toBe("a2"))
    expect(votes(cached())).toEqual([5, 4, 2])
    expect(cached().totalVotes).toBe(11)
    expect(cached("lunch").myAnswerId).toBe("a2")
    expect(castVote).toHaveBeenCalledWith("q1", "a2")

    // the server's numbers replace the guess
    request.resolve(
      poll({
        myAnswerId: "a2",
        totalVotes: 12,
        answers: [
          { id: "a1", text: "Pizza", votes: 5 },
          { id: "a2", text: "Thai", votes: 5 },
          { id: "a3", text: "Salad", votes: 2 },
        ],
      }),
    )
    await waitFor(() => expect(cached().totalVotes).toBe(12))
  })

  it("moves a vote to another answer", async () => {
    // What the server would answer: the same move the optimistic update makes.
    vi.mocked(castVote).mockResolvedValue(
      poll({
        myAnswerId: "a3",
        answers: [
          { id: "a1", text: "Pizza", votes: 4 },
          { id: "a2", text: "Thai", votes: 3 },
          { id: "a3", text: "Salad", votes: 3 },
        ],
      }),
    )
    const { result, cached } = setup(poll({ myAnswerId: "a1" }))

    act(() => result.current.vote("a3"))

    await waitFor(() => expect(castVote).toHaveBeenCalledWith("q1", "a3"))
    await waitFor(() => expect(cached().myAnswerId).toBe("a3"))
    expect(votes(cached())).toEqual([4, 3, 3])
    expect(cached().totalVotes).toBe(10)
  })

  it("removes the vote when told to vote for nothing", async () => {
    const request = deferred<Poll>()
    vi.mocked(removeVote).mockReturnValue(request.promise)
    const { result, cached } = setup(poll({ myAnswerId: "a1" }))

    act(() => result.current.vote(null))

    await waitFor(() => expect(cached().myAnswerId).toBeNull())
    expect(votes(cached())).toEqual([4, 3, 2])
    expect(cached().totalVotes).toBe(9)
    expect(removeVote).toHaveBeenCalledWith("q1")
    expect(castVote).not.toHaveBeenCalled()
    request.resolve(poll())
  })

  it("puts the poll back and says so when the vote fails", async () => {
    vi.mocked(castVote).mockRejectedValue(new Error("offline"))
    const { result, cached } = setup()

    act(() => result.current.vote("a2"))

    await waitFor(() => expect(result.current.error).toBe(VOTE_FAILED_MESSAGE))
    expect(cached()).toEqual(poll())
    expect(cached("lunch")).toEqual(poll())
  })

  it("clears the message on the next attempt", async () => {
    vi.mocked(castVote).mockRejectedValueOnce(new Error("offline"))
    vi.mocked(castVote).mockResolvedValueOnce(poll({ myAnswerId: "a2" }))
    const { result } = setup()

    act(() => result.current.vote("a2"))
    await waitFor(() => expect(result.current.error).toBe(VOTE_FAILED_MESSAGE))

    act(() => result.current.vote("a2"))
    await waitFor(() => expect(result.current.error).toBeNull())
  })

  it("closes the poll when the server says the deadline has passed", async () => {
    vi.mocked(castVote).mockRejectedValue(
      Object.assign(new Error("This poll has closed."), { response: { status: 409 } }),
    )
    const { result, cached } = setup()

    act(() => result.current.vote("a2"))

    await waitFor(() => expect(result.current.error).toBe(POLL_CLOSED_MESSAGE))
    expect(cached().isClosed).toBe(true)
    // back to how it was, just closed
    expect(cached().myAnswerId).toBeNull()
    expect(votes(cached())).toEqual([5, 3, 2])
  })

  it("keeps the second of two quick clicks on screen when the first answer arrives", async () => {
    const first = deferred<Poll>()
    const second = deferred<Poll>()
    vi.mocked(castVote).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, cached } = setup()

    act(() => result.current.vote("a1"))
    await waitFor(() => expect(cached().myAnswerId).toBe("a1"))
    act(() => result.current.vote("a2"))
    await waitFor(() => expect(cached().myAnswerId).toBe("a2"))

    // the server has only seen the first click so far
    await act(() => {
      first.resolve(poll({ myAnswerId: "a1", totalVotes: 11 }))
      return Promise.resolve()
    })
    expect(cached().myAnswerId).toBe("a2")

    await act(() => {
      second.resolve(poll({ myAnswerId: "a2", totalVotes: 11 }))
      return Promise.resolve()
    })
    await waitFor(() => expect(castVote).toHaveBeenCalledTimes(2))
    expect(vi.mocked(castVote).mock.calls[1]).toEqual(["q1", "a2"])
    await waitFor(() => expect(cached().myAnswerId).toBe("a2"))
  })
})
