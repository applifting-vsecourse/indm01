import { expect, test, type Browser } from "@playwright/test"

import { signIn, USERS } from "./signIn"

async function signedInPage(browser: Browser, user: { email: string; password: string }) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, user)
  return page
}

test("E1: user likes a quack, sees count persist, views likers, second user likes, first user unlikes", async ({
  browser,
}) => {
  const text = `E2E likeable quack ${Date.now()}`

  // User A posts a quack
  const userA = await signedInPage(browser, USERS.caffeinatedDuck)
  await userA.goto("/quacks")
  await userA.getByLabel(/new quack|post context/i).fill(text)
  await userA.getByRole("button", { name: "Quack", exact: true }).click()

  const articleA = userA.getByRole("article").filter({ hasText: text })
  await expect(articleA).toBeVisible()

  // Initial state: 0 likes, unpressed
  const likeBtnA = articleA.getByRole("button", { name: /^(like|unlike) quack$/i })
  const countBtnA = articleA.getByRole("button", { name: /^\d+ likes?$/i })
  await expect(likeBtnA).toHaveAttribute("aria-pressed", "false")
  await expect(countBtnA).toHaveText("0")

  // User A likes the quack
  await likeBtnA.click()
  await expect(likeBtnA).toHaveAttribute("aria-pressed", "true")
  await expect(countBtnA).toHaveText("1")

  // Persists across page reload
  await userA.reload()
  const reloadedArticleA = userA.getByRole("article").filter({ hasText: text })
  await expect(
    reloadedArticleA.getByRole("button", { name: /^(like|unlike) quack$/i }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    reloadedArticleA.getByRole("button", { name: /^\d+ likes?$/i }),
  ).toHaveText("1")

  // User B sees 1 like, unpressed, then likes it -> count becomes 2
  const userB = await signedInPage(browser, USERS.deepDuckThoughts)
  await userB.goto("/quacks")
  const articleB = userB.getByRole("article").filter({ hasText: text })
  await expect(articleB).toBeVisible()

  const likeBtnB = articleB.getByRole("button", { name: /^(like|unlike) quack$/i })
  const countBtnB = articleB.getByRole("button", { name: /^\d+ likes?$/i })
  await expect(likeBtnB).toHaveAttribute("aria-pressed", "false")
  await expect(countBtnB).toHaveText("1")

  await likeBtnB.click()
  await expect(likeBtnB).toHaveAttribute("aria-pressed", "true")
  await expect(countBtnB).toHaveText("2")

  // User B opens "who liked it" list and sees both users
  await countBtnB.click()
  const likersList = userB.getByRole("list", { name: /liked by/i })
  await expect(likersList).toBeVisible()
  await expect(likersList).toContainText(/caffeinated/i)
  await expect(likersList).toContainText(/deep duck/i)

  // User A takes the like back -> count becomes 1, unpressed
  await userA.reload()
  const finalArticleA = userA.getByRole("article").filter({ hasText: text })
  const finalLikeBtnA = finalArticleA.getByRole("button", {
    name: /^(like|unlike) quack$/i,
  })
  const finalCountBtnA = finalArticleA.getByRole("button", {
    name: /^\d+ likes?$/i,
  })
  await expect(finalCountBtnA).toHaveText("2")
  await finalLikeBtnA.click()
  await expect(finalLikeBtnA).toHaveAttribute("aria-pressed", "false")
  await expect(finalCountBtnA).toHaveText("1")
})

test("E2: user can like and unlike a reply", async ({ browser }) => {
  const quackText = `E2E parent for reply likes ${Date.now()}`
  const replyText = `E2E likeable reply ${Date.now()}`

  const userA = await signedInPage(browser, USERS.caffeinatedDuck)
  await userA.goto("/quacks")
  await userA.getByLabel(/new quack|post context/i).fill(quackText)
  await userA.getByRole("button", { name: "Quack", exact: true }).click()

  const articleA = userA.getByRole("article").filter({ hasText: quackText })
  await expect(articleA).toBeVisible()

  // User B replies to the quack
  const userB = await signedInPage(browser, USERS.deepDuckThoughts)
  await userB.goto("/quacks")
  const articleB = userB.getByRole("article").filter({ hasText: quackText })
  await articleB.getByRole("button", { name: /show replies/i }).click()
  await articleB.getByPlaceholder(/write a reply/i).fill(replyText)
  await articleB.getByRole("button", { name: "Reply", exact: true }).click()
  await expect(articleB).toContainText(replyText)

  // User A expands replies and likes/unlikes the reply
  await userA.reload()
  const reloadedArticleA = userA.getByRole("article").filter({ hasText: quackText })
  await reloadedArticleA.getByRole("button", { name: /show replies/i }).click()
  await expect(reloadedArticleA).toContainText(replyText)

  const replyLikeBtn = reloadedArticleA.getByRole("button", {
    name: /^(like|unlike) reply$/i,
  })
  const replyCountBtn = reloadedArticleA.getByRole("button", {
    name: /^\d+ likes? on reply$/i,
  })

  await expect(replyLikeBtn).toHaveAttribute("aria-pressed", "false")
  await expect(replyCountBtn).toHaveText("0")

  await replyLikeBtn.click()
  await expect(replyLikeBtn).toHaveAttribute("aria-pressed", "true")
  await expect(replyCountBtn).toHaveText("1")

  await replyLikeBtn.click()
  await expect(replyLikeBtn).toHaveAttribute("aria-pressed", "false")
  await expect(replyCountBtn).toHaveText("0")
})
