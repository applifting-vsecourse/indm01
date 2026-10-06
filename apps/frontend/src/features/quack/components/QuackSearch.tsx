import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Mirrors the server-side DTO (MaxLength(100)).
export const SEARCH_MAX_LENGTH = 100

// Long enough to skip the keystrokes in the middle of a word, short enough
// to feel like the list follows the typing.
const DEBOUNCE_MS = 300

type QuackSearchProps = {
  /** The search currently applied to the list (from the URL). */
  value: string
  onSearch: (search: string) => void
  className?: string
}

export function QuackSearch({ value, onSearch, className }: QuackSearchProps) {
  const [text, setText] = useState(value)

  // The URL can change without us, e.g. following a link to the plain feed.
  // Follow it, unless it only differs from what's typed by surrounding spaces.
  const [appliedValue, setAppliedValue] = useState(value)
  if (value !== appliedValue) {
    setAppliedValue(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    const search = text.trim()
    if (search === value) return
    const timeout = setTimeout(() => onSearch(search), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [text, value, onSearch])

  const clear = () => {
    setText("")
    onSearch("")
  }

  return (
    <div
      role="search"
      className={cn("flex flex-col gap-2", className)}
    >
      <Label htmlFor="quack-search">Search quacks</Label>
      <div className="relative">
        <Input
          id="quack-search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="e.g. pond or @CaffeinatedDuck"
          autoComplete="off"
          enterKeyHint="search"
          className="pr-9"
        />
        {text ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            onClick={clear}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
