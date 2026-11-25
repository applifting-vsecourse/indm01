import { useState } from "react"
import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useQuackLikers } from "@/features/quack/hooks/useQuackLikers"
import { useToggleQuackLike } from "@/features/quack/hooks/useToggleQuackLike"

type QuackLikeControlsProps = {
  quackId: string
  parentId?: string | null
  likeCount: number
  isLiked: boolean
  variant?: "quack" | "reply"
}

export function QuackLikeControls({
  quackId,
  parentId,
  likeCount,
  isLiked,
  variant = "quack",
}: QuackLikeControlsProps) {
  const [isLikersOpen, setIsLikersOpen] = useState(false)
  const toggleLikeMutation = useToggleQuackLike(quackId, parentId)
  const { data: likers, isLoading, isError, refetch } = useQuackLikers(quackId, isLikersOpen)

  const isReply = variant === "reply"
  const likeLabel = isLiked
    ? isReply
      ? "Unlike reply"
      : "Unlike quack"
    : isReply
      ? "Like reply"
      : "Like quack"
  const countWord = likeCount === 1 ? "like" : "likes"
  const countLabel = isReply ? `${likeCount} ${countWord} on reply` : `${likeCount} ${countWord}`

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`${isReply ? "h-7 px-1.5" : "h-8 px-2"} ${
          isLiked
            ? "text-primary hover:text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label={likeLabel}
        aria-pressed={isLiked}
        onClick={() => toggleLikeMutation.mutate(isLiked ? "unlike" : "like")}
      >
        <Heart className={`${isReply ? "size-3.5" : "size-4"} ${isLiked ? "fill-current" : ""}`} />
      </Button>

      <Dialog
        open={isLikersOpen}
        onOpenChange={setIsLikersOpen}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`${isReply ? "h-7 px-1.5" : "h-8 px-2"} text-xs text-muted-foreground hover:text-foreground`}
            aria-label={countLabel}
          >
            {likeCount}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liked by</DialogTitle>
            <DialogDescription>
              {isReply ? "People who liked this reply." : "People who liked this quack."}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="py-2 text-sm text-muted-foreground">Loading likes...</p>
          ) : isError ? (
            <div className="flex items-center justify-between gap-2 py-2">
              <p className="text-sm text-destructive">Failed to load likes.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
          ) : likers && likers.length > 0 ? (
            <ul
              aria-label="Liked by"
              className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto"
            >
              {likers.map((liker) => (
                <li
                  key={liker.id}
                  className="flex flex-wrap items-baseline gap-2 py-2 text-sm"
                >
                  <UsersName name={liker.name} />
                  {liker.username ? <UsersUserName username={liker.username} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              No one has liked this {isReply ? "reply" : "quack"} yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
