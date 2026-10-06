import type { QuackMood } from "@/features/quack/api/quackSchemas"
import { moodDetails } from "@/features/quack/lib/moods"

type QuackMoodLabelProps = { mood: QuackMood }

export function QuackMoodLabel({ mood }: QuackMoodLabelProps) {
  const { label, icon: Icon } = moodDetails[mood]

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon
        className="size-3"
        aria-hidden
      />
      <span className="sr-only">Mood:</span>
      {label}
    </span>
  )
}
