import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import {
  applyVote,
  formatTimeLeft,
  formatVoteCount,
  getWinnerIds,
  votePercentage,
} from "@/features/quack/lib/pollResults"

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const poll = (votes: [number, number, number], myAnswerId: string | null = null): Poll => ({
  id: "p1",
  closesAt: new Date("2026-01-02T12:00:00Z"),
  isClosed: false,
  totalVotes: votes[0] + votes[1] + votes[2],
  myAnswerId,
  answers: [
    { id: "a1", text: "Pizza", votes: votes[0] },
    { id: "a2", text: "Thai", votes: votes[1] },
    { id: "a3", text: "Salad", votes: votes[2] },
  ],
})

describe("formatTimeLeft", () => {
  it.each([
    ["30 seconds", 30_000, "1 min"],
    ["45 minutes", 45 * MINUTE, "45 min"],
    ["60 minutes", 60 * MINUTE, "60 min"],
    ["61 minutes", 61 * MINUTE, "2 h"],
    ["3 hours", 3 * HOUR, "3 h"],
    ["24 hours", 24 * HOUR, "24 h"],
    ["25 hours", 25 * HOUR, "2 d"],
    ["a week", 168 * HOUR, "7 d"],
  ])("reads %s as %s", (_label, ms, expected) => {
    expect(formatTimeLeft(ms)).toBe(expected)
  })

  it("rounds up, so a poll never claims to close sooner than it does", () => {
    expect(formatTimeLeft(2 * HOUR + 1)).toBe("3 h")
    expect(formatTimeLeft(6 * 24 * HOUR + HOUR)).toBe("7 d")
  })
})

describe("formatVoteCount", () => {
  it("uses the singular for one vote", () => {
    expect(formatVoteCount(1)).toBe("1 vote")
    expect(formatVoteCount(0)).toBe("0 votes")
    expect(formatVoteCount(10)).toBe("10 votes")
  })
})

describe("votePercentage", () => {
  it("rounds to a whole number", () => {
    expect(votePercentage(5, 10)).toBe(50)
    expect(votePercentage(1, 3)).toBe(33)
    expect(votePercentage(2, 3)).toBe(67)
  })

  it("is 0 for a poll without votes", () => {
    expect(votePercentage(0, 0)).toBe(0)
  })
})

describe("getWinnerIds", () => {
  it("picks the answer with the most votes", () => {
    expect(getWinnerIds(poll([5, 3, 2]))).toEqual(new Set(["a1"]))
  })

  it("keeps every answer tied for first", () => {
    expect(getWinnerIds(poll([4, 4, 2]))).toEqual(new Set(["a1", "a2"]))
  })

  it("names no winner when nobody voted", () => {
    expect(getWinnerIds(poll([0, 0, 0]))).toEqual(new Set())
  })
})

describe("applyVote", () => {
  it("adds a first vote", () => {
    const result = applyVote(poll([5, 3, 2]), "a2")

    expect(result.myAnswerId).toBe("a2")
    expect(result.totalVotes).toBe(11)
    expect(result.answers.map((answer) => answer.votes)).toEqual([5, 4, 2])
  })

  it("moves a vote and keeps the total", () => {
    const result = applyVote(poll([5, 3, 2], "a1"), "a3")

    expect(result.myAnswerId).toBe("a3")
    expect(result.totalVotes).toBe(10)
    expect(result.answers.map((answer) => answer.votes)).toEqual([4, 3, 3])
  })

  it("removes a vote", () => {
    const result = applyVote(poll([5, 3, 2], "a1"), null)

    expect(result.myAnswerId).toBeNull()
    expect(result.totalVotes).toBe(9)
    expect(result.answers.map((answer) => answer.votes)).toEqual([4, 3, 2])
  })

  it("changes nothing when the vote is already there", () => {
    const before = poll([5, 3, 2], "a1")

    expect(applyVote(before, "a1")).toBe(before)
  })

  it("doesn't touch the poll it was given", () => {
    const before = poll([5, 3, 2])
    applyVote(before, "a1")

    expect(before.totalVotes).toBe(10)
    expect(before.answers[0]?.votes).toBe(5)
  })
})
