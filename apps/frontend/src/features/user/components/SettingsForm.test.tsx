import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { updateUserSettings } from "@/features/user/api/updateUserSettings"
import type { UserSettingsResponse } from "@/features/user/api/userSchemas"

import { SettingsForm } from "./SettingsForm"

vi.mock("@/features/user/api/updateUserSettings", () => ({
  updateUserSettings: vi.fn(),
}))

const defaultSettings: UserSettingsResponse = {
  id: "u1",
  email: "duck@pond.com",
  name: "Caffeinated Duck",
  username: "CaffeinatedDuck",
  bio: "Just a duck",
  defaultMood: "happy",
}

const renderForm = (settings: UserSettingsResponse = defaultSettings) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsForm settings={settings} />
    </QueryClientProvider>,
  )

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.mocked(updateUserSettings).mockReset()
  })

  it("starts with the current username, display name, bio and default mood", () => {
    renderForm()

    expect(screen.getByLabelText("Username")).toHaveValue("CaffeinatedDuck")
    expect(screen.getByLabelText("Display name")).toHaveValue("Caffeinated Duck")
    expect(screen.getByLabelText("Bio")).toHaveValue("Just a duck")
    expect(screen.getByRole("combobox", { name: "Default mood" })).toHaveTextContent("Happy")
  })

  it("validates username length and allowed characters", async () => {
    renderForm()
    const user = userEvent.setup()

    const usernameInput = screen.getByLabelText("Username")
    await user.clear(usernameInput)
    await user.type(usernameInput, "ab")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Username must be at least 3 characters")).toBeInTheDocument()

    await user.clear(usernameInput)
    await user.type(usernameInput, "invalid name with spaces!")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(
      await screen.findByText("Username can only contain letters, numbers, dots and underscores"),
    ).toBeInTheDocument()

    expect(updateUserSettings).not.toHaveBeenCalled()
  })

  it("requires a display name", async () => {
    renderForm()
    const user = userEvent.setup()

    const nameInput = screen.getByLabelText("Display name")
    await user.clear(nameInput)
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Display name is required")).toBeInTheDocument()
    expect(updateUserSettings).not.toHaveBeenCalled()
  })

  it("shows error next to username field if username is taken, and typed value stays", async () => {
    vi.mocked(updateUserSettings).mockRejectedValueOnce(new Error("This username is already taken"))

    renderForm()
    const user = userEvent.setup()

    const usernameInput = screen.getByLabelText("Username")
    await user.clear(usernameInput)
    await user.type(usernameInput, "TakenDuck")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("This username is already taken")).toBeInTheDocument()
    // What I typed stays there
    expect(usernameInput).toHaveValue("TakenDuck")
  })

  it("saves changes and displays confirmation", async () => {
    vi.mocked(updateUserSettings).mockResolvedValueOnce({
      id: "u1",
      email: "duck@pond.com",
      name: "New Name",
      username: "NewUsername",
      bio: "New bio",
      defaultMood: "silly",
    })

    renderForm()
    const user = userEvent.setup()

    const usernameInput = screen.getByLabelText("Username")
    const nameInput = screen.getByLabelText("Display name")
    const bioInput = screen.getByLabelText("Bio")

    await user.clear(usernameInput)
    await user.type(usernameInput, "NewUsername")

    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    await user.clear(bioInput)
    await user.type(bioInput, "New bio")

    await user.click(screen.getByRole("combobox", { name: "Default mood" }))
    await user.click(await screen.findByRole("option", { name: "Silly" }))

    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(updateUserSettings).toHaveBeenCalledWith({
        name: "New Name",
        username: "NewUsername",
        bio: "New bio",
        defaultMood: "silly",
      })
    })

    expect(await screen.findByText("Your settings have been saved.")).toBeInTheDocument()
  })

  it("discards changes and reverts back to saved values", async () => {
    renderForm()
    const user = userEvent.setup()

    const usernameInput = screen.getByLabelText("Username")
    const nameInput = screen.getByLabelText("Display name")
    const bioInput = screen.getByLabelText("Bio")

    await user.type(usernameInput, "_modified")
    await user.type(nameInput, "_modified")
    await user.type(bioInput, "_modified")

    expect(usernameInput).toHaveValue("CaffeinatedDuck_modified")
    expect(nameInput).toHaveValue("Caffeinated Duck_modified")
    expect(bioInput).toHaveValue("Just a duck_modified")

    const discardBtn = screen.getByRole("button", { name: "Discard changes" })
    expect(discardBtn).toBeEnabled()

    await user.click(discardBtn)

    expect(usernameInput).toHaveValue("CaffeinatedDuck")
    expect(nameInput).toHaveValue("Caffeinated Duck")
    expect(bioInput).toHaveValue("Just a duck")
  })
})
