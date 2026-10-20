import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
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

  describe("poll", () => {
    const submit = () => userEvent.click(screen.getByRole("button", { name: "Quack" }))

    it("starts without poll fields", () => {
      renderForm()

      expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Add poll" })).toBeInTheDocument()
    })

    it("shows two answers and a poll length of 1 day", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

      expect(screen.getByLabelText("Answer 1")).toBeInTheDocument()
      expect(screen.getByLabelText("Answer 2")).toBeInTheDocument()
      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
      expect(screen.getByRole("combobox", { name: "Poll length" })).toHaveTextContent("1 day")
    })

    it("offers the three poll lengths", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.click(screen.getByRole("combobox", { name: "Poll length" }))

      expect(await screen.findByRole("option", { name: "1 hour" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "1 day" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "1 week" })).toBeInTheDocument()
    })

    it("allows at most four answers", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      expect(screen.getByLabelText("Answer 3")).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      expect(screen.getByLabelText("Answer 4")).toBeInTheDocument()

      expect(screen.queryByRole("button", { name: "Add answer" })).not.toBeInTheDocument()
    })

    it("lets answers be removed only while more than two are left", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      expect(screen.queryByRole("button", { name: /remove answer/i })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      await userEvent.click(screen.getByRole("button", { name: "Remove answer 3" }))

      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /remove answer/i })).not.toBeInTheDocument()
    })

    it("won't take an answer longer than 50 characters", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

      expect(screen.getByLabelText("Answer 1")).toHaveAttribute("maxlength", "50")
    })

    it("asks for every answer and posts nothing while one is empty", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await submit()

      expect(await screen.findByText("Fill in this answer")).toBeInTheDocument()
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("rejects the same answer twice, ignoring case and spaces", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.type(screen.getByLabelText("Answer 2"), " pizza ")
      await submit()

      expect(await screen.findByText("Answers must be different")).toBeInTheDocument()
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("posts the question with trimmed answers and the chosen length", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Where do we go for lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), " Pizza ")
      await userEvent.type(screen.getByLabelText("Answer 2"), "Thai")
      await userEvent.click(screen.getByRole("combobox", { name: "Poll length" }))
      await userEvent.click(await screen.findByRole("option", { name: "1 week" }))
      await submit()

      expect(addQuack).toHaveBeenCalledWith(
        {
          text: "Where do we go for lunch?",
          mood: null,
          poll: { answers: ["Pizza", "Thai"], duration: "1w" },
        },
        expect.anything(),
      )
    })

    it("posts a plain quack again after the poll is removed", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Never mind")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.click(screen.getByRole("button", { name: "Remove poll" }))

      expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()

      await submit()

      expect(addQuack).toHaveBeenCalledWith({ text: "Never mind", mood: null }, expect.anything())
    })

    it("goes back to a plain, empty form after posting a poll", async () => {
      vi.mocked(addQuack).mockResolvedValue({} as never)
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.type(screen.getByLabelText("Answer 2"), "Thai")
      await submit()

      await waitFor(() => expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument())
      expect(screen.getByLabelText("New quack")).toHaveValue("")
      expect(screen.getByRole("button", { name: "Add poll" })).toBeInTheDocument()
    })
  })
})
