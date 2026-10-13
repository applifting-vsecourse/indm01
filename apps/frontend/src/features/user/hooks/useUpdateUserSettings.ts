import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { authKeys } from "@/lib/auth-keys"

import {
  updateUserSettings,
  type UpdateUserSettingsInput,
} from "@/features/user/api/updateUserSettings"
import { userKeys } from "@/features/user/api/userKeys"

export function useUpdateUserSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateUserSettingsInput) => updateUserSettings(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.session() }),
        queryClient.invalidateQueries({ queryKey: userKeys.settings() }),
        queryClient.invalidateQueries({ queryKey: ["quacks"] }),
      ])
      toast.success("Settings saved")
    },
  })
}
