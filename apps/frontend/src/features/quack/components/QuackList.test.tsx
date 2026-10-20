// Example component test — the pattern to copy for your own components.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

// A poll talks to the API, which isn't the point of a list test (and the real
// client needs a configured environment to even import).
vi.mock("@/features/quack/api/vote", () => ({ castVote: vi.fn(), removeVote: vi.fn() }))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderList = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={createTestQueryClient()}>{ui}</QueryClientProvider>)

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    renderList(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows the mood of a quack that has one", () => {
    renderList(<QuackList quacks={[quack({ mood: "silly" })]} />)

    expect(screen.getByText("Silly")).toBeInTheDocument()
    expect(screen.getByText("Mood:")).toBeInTheDocument()
  })

  it("shows no mood for a quack without one", () => {
    renderList(<QuackList quacks={[quack()]} />)

    expect(screen.queryByText("Mood:")).not.toBeInTheDocument()
  })

  it("says nothing matched when a search finds no quacks", () => {
    renderList(
      <QuackList
        quacks={[]}
        search="pond"
      />,
    )

    expect(screen.getByText('No quacks match "pond".')).toBeInTheDocument()
    expect(screen.queryByText(/no quacks yet/i)).not.toBeInTheDocument()
  })

  it("doesn't claim nothing matched while a search is still loading", () => {
    renderList(
      <QuackList
        quacks={[]}
        search="pond"
        isLoading
      />,
    )

    expect(screen.queryByText(/no quacks match/i)).not.toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    renderList(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("renders Delete action only for quacks belonging to current user", () => {
    const myQuack = quack({ id: "q1", userId: "me" })
    const otherQuack = quack({ id: "q2", userId: "other", text: "other quack" })

    renderList(
      <QuackList
        quacks={[myQuack, otherQuack]}
        currentUserId="me"
      />,
    )

    const deleteButtons = screen.getAllByRole("button", { name: /delete quack/i })
    expect(deleteButtons).toHaveLength(1)
  })

  it("renders Delete action on every quack when current user is admin", () => {
    const quack1 = quack({ id: "q1", userId: "user1", text: "first" })
    const quack2 = quack({ id: "q2", userId: "user2", text: "second" })

    renderList(
      <QuackList
        quacks={[quack1, quack2]}
        currentUserId="admin-id"
        currentUserRole="admin"
      />,
    )

    const deleteButtons = screen.getAllByRole("button", { name: /delete quack/i })
    expect(deleteButtons).toHaveLength(2)
  })

  it("opens confirmation dialog before deleting", async () => {
    const myQuack = quack({ id: "q1", userId: "me" })

    renderList(
      <QuackList
        quacks={[myQuack]}
        currentUserId="me"
      />,
    )

    const deleteBtn = screen.getByRole("button", { name: /delete quack/i })
    await userEvent.click(deleteBtn)

    expect(screen.getByRole("heading", { name: /delete quack\?/i })).toBeInTheDocument()
    expect(screen.getByText(/are you sure you want to delete this quack\?/i)).toBeInTheDocument()
  })
})
