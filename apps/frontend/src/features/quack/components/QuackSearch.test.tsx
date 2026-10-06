import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { QuackSearch } from "@/features/quack/components/QuackSearch"

describe("QuackSearch", () => {
  it("searches once typing pauses, without pressing Enter", async () => {
    const onSearch = vi.fn()
    render(
      <QuackSearch
        value=""
        onSearch={onSearch}
      />,
    )

    await userEvent.type(screen.getByLabelText("Search quacks"), "pond")

    await waitFor(() => expect(onSearch).toHaveBeenCalledWith("pond"))
    // the whole word arrives as one search, not one per keystroke
    expect(onSearch).toHaveBeenCalledOnce()
  })

  it("trims surrounding spaces, so only spaces means no search", async () => {
    const onSearch = vi.fn()
    render(
      <QuackSearch
        value="pond"
        onSearch={onSearch}
      />,
    )

    const input = screen.getByLabelText("Search quacks")
    await userEvent.clear(input)
    await userEvent.type(input, "   ")

    await waitFor(() => expect(onSearch).toHaveBeenCalledWith(""))
  })

  it("starts from the search in the URL", () => {
    render(
      <QuackSearch
        value="pond"
        onSearch={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Search quacks")).toHaveValue("pond")
  })

  it("offers a clear button only when there is something to clear", async () => {
    const onSearch = vi.fn()
    render(
      <QuackSearch
        value="pond"
        onSearch={onSearch}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))

    expect(onSearch).toHaveBeenCalledWith("")
    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()
  })

  it("follows the URL when it changes underneath it", () => {
    const { rerender } = render(
      <QuackSearch
        value="pond"
        onSearch={vi.fn()}
      />,
    )

    rerender(
      <QuackSearch
        value=""
        onSearch={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
  })
})
