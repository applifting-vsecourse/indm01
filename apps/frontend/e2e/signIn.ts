import { expect, type Page } from "@playwright/test"

export const API = "http://localhost:4050/api"

// Seeded accounts (see the project README)
export const USERS = {
  caffeinatedDuck: { email: "caffeinatedduck@example.com", password: "password1" },
  deepDuckThoughts: { email: "deepduckthoughts@example.com", password: "password2" },
  admin: { email: "admin@example.com", password: "adminpassword" },
} as const

export async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  // the header's user menu only appears once the session is loaded
  await expect(page.getByRole("button", { name: "User menu" })).toBeVisible({ timeout: 30_000 })
}
