import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

vi.mock("@/features/quack/api/getReplies", () => ({
  getReplies: vi.fn().mockResolvedValue([
    {
      id: "r1",
      text: "First reply here",
      mood: null,
      userId: "u2",
      createdAt: new Date("2026-01-01T12:30:00Z"),
      user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
      poll: null,
      parentId: "q1",
    },
  ]),
}))

vi.mock("@/features/quack/api/addQuack", () => ({
  addQuack: vi.fn().mockResolvedValue({
    id: "r2",
    text: "My new reply",
    mood: null,
    userId: "u1",
    createdAt: new Date("2026-01-01T12:35:00Z"),
    user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
    poll: null,
    parentId: "q1",
  }),
}))

vi.mock("@/features/quack/api/deleteQuack", () => ({
  deleteQuack: vi.fn().mockResolvedValue(undefined),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderQuackItem = (quack: Quack, currentUserId?: string, currentUserRole?: string) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <QuackItem
        quack={quack}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </QueryClientProvider>,
  )

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "Hello world",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  replyCount: 1,
  ...overrides,
})

describe("QuackItem replies and tombstone", () => {
  it("displays reply count badge", () => {
    renderQuackItem(aQuack({ replyCount: 3 }))
    expect(screen.getByText("3 replies")).toBeInTheDocument()
  })

  it("expands replies section when reply button is clicked", async () => {
    renderQuackItem(aQuack({ replyCount: 1 }), "u1")

    const replyBtn = screen.getByRole("button", { name: /show replies/i })
    await userEvent.click(replyBtn)

    expect(await screen.findByText("First reply here")).toBeInTheDocument()
    expect(screen.getByText("Deep Duck Thoughts")).toBeInTheDocument()
    expect(screen.getByLabelText(/post a reply/i)).toBeInTheDocument()
  })

  it("submits a reply through the form", async () => {
    renderQuackItem(aQuack({ replyCount: 1 }), "u1")

    const replyBtn = screen.getByRole("button", { name: /show replies/i })
    await userEvent.click(replyBtn)

    const textarea = await screen.findByLabelText(/post a reply/i)
    await userEvent.type(textarea, "My new reply")

    const submitBtn = screen.getByRole("button", { name: /^reply$/i })
    await userEvent.click(submitBtn)

    const { addQuack } = await import("@/features/quack/api/addQuack")
    expect(addQuack).toHaveBeenCalledWith({
      text: "My new reply",
      parentId: "q1",
    })
  })

  it("renders a tombstone when quack is deleted", () => {
    const deletedQuack = aQuack({
      deletedAt: new Date("2026-01-02T10:00:00Z"),
      replyCount: 2,
    })

    renderQuackItem(deletedQuack, "u1")

    expect(screen.getByText("[This quack was deleted]")).toBeInTheDocument()
    expect(screen.getByText("[deleted]")).toBeInTheDocument()
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument()
    expect(screen.queryByText("Caffeinated Duck")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete quack/i })).not.toBeInTheDocument()
    expect(screen.getByText("2 replies")).toBeInTheDocument()
  })
})
