import { useQuery } from "@tanstack/react-query"

import { getQuackLikers } from "@/features/quack/api/likes"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useQuackLikers(quackId: string, isEnabled: boolean) {
  return useQuery({
    queryKey: quackKeys.likes(quackId),
    queryFn: () => getQuackLikers(quackId),
    enabled: isEnabled,
  })
}
