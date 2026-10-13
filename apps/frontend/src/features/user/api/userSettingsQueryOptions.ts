import { queryOptions } from "@tanstack/react-query"

import { getUserSettings } from "./getUserSettings"
import { userKeys } from "./userKeys"

export const userSettingsQueryOptions = () =>
  queryOptions({
    queryKey: userKeys.settings(),
    queryFn: getUserSettings,
  })
