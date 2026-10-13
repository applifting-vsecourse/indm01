import { api } from "@/lib/api-client"
import type { QuackMood } from "@/types/moods"

import { userSettingsResponseSchema, type UserSettingsResponse } from "./userSchemas"

export type UpdateUserSettingsInput = {
  name: string
  username: string
  bio?: string | null
  defaultMood?: QuackMood | null
}

export const updateUserSettings = async (
  input: UpdateUserSettingsInput,
): Promise<UserSettingsResponse> => {
  const json = await api.patch("users/settings", { json: input }).json()
  return userSettingsResponseSchema.parse(json)
}
