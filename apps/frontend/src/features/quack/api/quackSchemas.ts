import { z } from "zod"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
import { quackMoodSchema } from "@/types/moods"

export { quackMoodSchema }

export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

// Mirrors the backend POLL_DURATIONS — the order here is the order shown in the form.
export const POLL_DURATIONS = ["1h", "1d", "1w"] as const

export const pollAnswerSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().int(),
})

export const pollSchema = z.object({
  id: z.string(),
  closesAt: z.coerce.date(),
  // Decided by the server's clock; the client also closes the poll at closesAt.
  isClosed: z.boolean(),
  totalVotes: z.number().int(),
  // The signed-in user's vote, if any.
  myAnswerId: z.string().nullable(),
  answers: z.array(pollAnswerSchema),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type Poll = z.infer<typeof pollSchema>
export type PollAnswer = z.infer<typeof pollAnswerSchema>
export type PollDuration = (typeof POLL_DURATIONS)[number]
export type QuackMood = z.infer<typeof quackMoodSchema>
