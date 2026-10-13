import { api } from "@/lib/api-client"

import { userSettingsResponseSchema, type UserSettingsResponse } from "./userSchemas"

export const getUserSettings = async (): Promise<UserSettingsResponse> => {
  const json = await api.get("users/settings").json()
  return userSettingsResponseSchema.parse(json)
}
