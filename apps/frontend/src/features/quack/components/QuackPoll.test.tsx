import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { castVote, removeVote } from "@/features/quack/api/vote"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

vi.mock("@/features/quack/api/vote", () => ({ castVote: vi.fn(), removeVote: vi.fn() }))

const NOW = new Date("2026-01-01T12:00:00Z")
const IN_3_HOURS = new Date("2026-01-01T15:00:00Z")

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  closesAt: IN_3_HOURS,
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

const withAnswers = (votes: [number, number, number], overrides: Partial<Poll> = {}) =>
  poll({
    totalVotes: votes[0] + votes[1] + votes[2],
    answers: [
      { id: "a1", text: "Pizza", votes: votes[0] },
      { id: "a2", text: "Thai", votes: votes[1] },
      { id: "a3", text: "Salad", votes: votes[2] },
    ],
    ...overrides,
  })

// Somebody other than the author, unless a test says otherwise.
const renderPoll = (value: Poll, currentUserId = "voter") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackPoll
        quackId="q1"
        authorId="author"
        currentUserId={currentUserId}
        poll={value}
      />
    </QueryClientProvider>,
  )

describe("QuackPoll", () => {
  beforeEach(() => {
    // Fixed clock, so the countdown text is the same on every run.
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.mocked(castVote).mockReset()
    vi.mocked(removeVote).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("for someone who can vote", () => {
    it("shows each answer with its count and percentage, and the footer", () => {
      renderPoll(poll())

      expect(screen.getByRole("button", { name: "Pizza, 5 votes, 50%" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Thai, 3 votes, 30%" })).toBeInTheDocument()
      expect(screen.getByText("5 · 50%")).toBeInTheDocument()
      expect(screen.getByText("10 votes · Closes in 3 h")).toBeInTheDocument()
    })

    it("uses the singular for a single vote", () => {
      renderPoll(withAnswers([1, 0, 0]))

      expect(screen.getByText("1 vote · Closes in 3 h")).toBeInTheDocument()
    })

    it("shows zero votes as 0 · 0% on every answer", () => {
      renderPoll(withAnswers([0, 0, 0]))

      expect(screen.getAllByText("0 · 0%")).toHaveLength(3)
      expect(screen.getByText("0 votes · Closes in 3 h")).toBeInTheDocument()
    })

    it("marks the answer the user picked and explains how to take the vote back", () => {
      renderPoll(poll({ myAnswerId: "a2" }))

      expect(screen.getByRole("button", { name: /^Thai/ })).toHaveAttribute("aria-pressed", "true")
      expect(screen.getByRole("button", { name: /^Pizza/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      )
      expect(screen.getByRole("img", { name: "Your vote" })).toBeInTheDocument()
      expect(screen.getByText("Click your answer again to remove your vote.")).toBeInTheDocument()
    })

    it("doesn't show the hint before voting", () => {
      renderPoll(poll())

      expect(screen.queryByText(/click your answer again/i)).not.toBeInTheDocument()
    })

    it("casts a vote on click", async () => {
      vi.mocked(castVote).mockResolvedValue(poll())
      renderPoll(poll())

      fireEvent.click(screen.getByRole("button", { name: /^Thai/ }))

      await vi.waitFor(() => expect(castVote).toHaveBeenCalledWith("q1", "a2"))
    })

    it("takes the vote back when the picked answer is clicked again", async () => {
      vi.mocked(removeVote).mockResolvedValue(poll())
      renderPoll(poll({ myAnswerId: "a2" }))

      fireEvent.click(screen.getByRole("button", { name: /^Thai/ }))

      await vi.waitFor(() => expect(removeVote).toHaveBeenCalledWith("q1"))
      expect(castVote).not.toHaveBeenCalled()
    })

    it("tells the user when the vote didn't go through", async () => {
      vi.mocked(castVote).mockRejectedValue(new Error("offline"))
      renderPoll(poll())

      fireEvent.click(screen.getByRole("button", { name: /^Thai/ }))

      await vi.waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Your vote didn't go through. Try again.",
        ),
      )
    })

    it("closes at the deadline without a reload", () => {
      renderPoll(poll())
      expect(screen.getAllByRole("button")).toHaveLength(3)

      act(() => {
        vi.advanceTimersByTime(3 * 60 * 60 * 1000)
      })

      expect(screen.queryAllByRole("button")).toHaveLength(0)
      expect(screen.getByText("10 votes · Closed")).toBeInTheDocument()
    })

    it("counts down while the page stays open", () => {
      renderPoll(poll())

      act(() => {
        vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 15 * 60 * 1000)
      })

      expect(screen.getByText("10 votes · Closes in 45 min")).toBeInTheDocument()
    })
  })

  describe("for the author", () => {
    it("shows the numbers but offers no way to vote", () => {
      renderPoll(poll(), "author")

      expect(screen.queryAllByRole("button")).toHaveLength(0)
      expect(screen.getByText("5 · 50%")).toBeInTheDocument()
      expect(screen.getByText("10 votes · Closes in 3 h")).toBeInTheDocument()
      expect(screen.queryByText(/click your answer again/i)).not.toBeInTheDocument()
    })
  })

  describe("once it has closed", () => {
    it("shows the final numbers without buttons, and no countdown", () => {
      renderPoll(poll({ isClosed: true }))

      expect(screen.queryAllByRole("button")).toHaveLength(0)
      expect(screen.getByText("5 · 50%")).toBeInTheDocument()
      expect(screen.getByText("10 votes · Closed")).toBeInTheDocument()
      expect(screen.queryByText(/closes in/i)).not.toBeInTheDocument()
    })

    it("closes on the server's word even while the local clock says it is still open", () => {
      renderPoll(poll({ isClosed: true, closesAt: new Date("2026-01-02T12:00:00Z") }))

      expect(screen.queryAllByRole("button")).toHaveLength(0)
      expect(screen.getByText("10 votes · Closed")).toBeInTheDocument()
    })

    it("highlights the winner with a trophy", () => {
      renderPoll(poll({ isClosed: true }))

      expect(screen.getAllByRole("img", { name: "Winner" })).toHaveLength(1)
      expect(screen.getByText("Pizza")).toHaveClass("font-semibold")
      expect(screen.getByText("Thai")).not.toHaveClass("font-semibold")
    })

    it("highlights every answer tied for first", () => {
      renderPoll(withAnswers([4, 4, 2], { isClosed: true }))

      expect(screen.getAllByRole("img", { name: "Winner" })).toHaveLength(2)
    })

    it("highlights nothing when nobody voted", () => {
      renderPoll(withAnswers([0, 0, 0], { isClosed: true }))

      expect(screen.queryByRole("img", { name: "Winner" })).not.toBeInTheDocument()
      expect(screen.getByText("No votes · Closed")).toBeInTheDocument()
    })

    it("keeps the user's own pick marked", () => {
      renderPoll(poll({ isClosed: true, myAnswerId: "a2" }))

      expect(screen.getByRole("img", { name: "Your vote" })).toBeInTheDocument()
    })
  })
})
