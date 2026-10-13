import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { QuackMood } from "@/types/moods"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

const renderForm = (defaultMood?: QuackMood | null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackForm defaultMood={defaultMood} />
    </QueryClientProvider>,
  )

describe("QuackForm", () => {
  beforeEach(() => {
    vi.mocked(addQuack).mockReset()
  })

  it("posts without a mood by default", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "hello pond")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(addQuack).toHaveBeenCalledWith({ text: "hello pond", mood: null }, expect.anything())
  })

  it("posts the mood the author picked", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "bread!")
    await userEvent.click(screen.getByRole("combobox", { name: "Mood" }))
    await userEvent.click(await screen.findByRole("option", { name: "Silly" }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(addQuack).toHaveBeenCalledWith({ text: "bread!", mood: "silly" }, expect.anything())
  })

  it("starts with the user's default mood when configured", async () => {
    renderForm("happy")

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("Happy")

    await userEvent.type(screen.getByLabelText("New quack"), "morning pond!")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(addQuack).toHaveBeenCalledWith(
      { text: "morning pond!", mood: "happy" },
      expect.anything(),
    )
  })
})
