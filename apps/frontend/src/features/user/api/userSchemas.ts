import { z } from "zod"

import { quackMoodSchema } from "@/types/moods"

export const NO_DEFAULT_MOOD = "none"

export const userSettingsResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  username: z.string(),
  bio: z.string().nullable(),
  defaultMood: quackMoodSchema.nullable(),
})

export const userSettingsFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, dots and underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
  defaultMood: z.union([quackMoodSchema, z.literal(NO_DEFAULT_MOOD)]),
})

export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>
export type UserSettingsFormValues = z.infer<typeof userSettingsFormSchema>
