import { useQuery } from "@tanstack/react-query"

import { userSettingsQueryOptions } from "@/features/user/api/userSettingsQueryOptions"

export function useUserSettings() {
  return useQuery(userSettingsQueryOptions())
}
