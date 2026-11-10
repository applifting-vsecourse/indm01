import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useAddReply } from "@/features/quack/hooks/useAddReply"

const MAX_REPLY_LENGTH = 280

type ReplyFormProps = {
  parentId: string
  onSuccess?: () => void
}

export function ReplyForm({ parentId, onSuccess }: ReplyFormProps) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const addReplyMutation = useAddReply(parentId)

  const remainingChars = MAX_REPLY_LENGTH - text.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) {
      setError("Reply cannot be empty.")
      return
    }
    if (trimmed.length > MAX_REPLY_LENGTH) {
      setError(`Reply cannot exceed ${MAX_REPLY_LENGTH} characters.`)
      return
    }

    try {
      setError(null)
      await addReplyMutation.mutateAsync(trimmed)
      setText("")
      onSuccess?.()
    } catch {
      setError("Failed to post reply. Please try again.")
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 pt-2 pb-3"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor={`reply-${parentId}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Post a reply
          </Label>
          <span
            className={`text-xs ${remainingChars < 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {remainingChars}
          </span>
        </div>
        <Textarea
          id={`reply-${parentId}`}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Quack your reply..."
          rows={2}
          className="resize-none text-sm"
          disabled={addReplyMutation.isPending}
        />
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={addReplyMutation.isPending || !text.trim() || remainingChars < 0}
        >
          {addReplyMutation.isPending ? "Replying..." : "Reply"}
        </Button>
      </div>
    </form>
  )
}
