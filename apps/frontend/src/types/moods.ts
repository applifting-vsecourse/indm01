import { Angry, Frown, Laugh, Smile, type LucideIcon } from "lucide-react"
import { z } from "zod"

export const quackMoodSchema = z.enum(["happy", "sad", "angry", "silly"])

export type QuackMood = z.infer<typeof quackMoodSchema>

export const moodDetails: Record<QuackMood, { label: string; icon: LucideIcon }> = {
  happy: { label: "Happy", icon: Smile },
  sad: { label: "Sad", icon: Frown },
  angry: { label: "Angry", icon: Angry },
  silly: { label: "Silly", icon: Laugh },
}
