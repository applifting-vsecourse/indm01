import { Angry, Frown, Laugh, Smile, type LucideIcon } from "lucide-react"

import type { QuackMood } from "@/features/quack/api/quackSchemas"

export const moodDetails: Record<QuackMood, { label: string; icon: LucideIcon }> = {
  happy: { label: "Happy", icon: Smile },
  sad: { label: "Sad", icon: Frown },
  angry: { label: "Angry", icon: Angry },
  silly: { label: "Silly", icon: Laugh },
}
