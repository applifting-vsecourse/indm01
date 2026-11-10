import { useState } from "react"
import { MessageSquare, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackMoodLabel } from "@/features/quack/components/QuackMoodLabel"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { ReplySection } from "@/features/quack/components/ReplySection"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type QuackItemProps = {
  quack: Quack
  currentUserId?: string
  currentUserRole?: string
}

export function QuackItem({ quack, currentUserId, currentUserRole }: QuackItemProps) {
  const deleteQuackMutation = useDeleteQuack()
  const [isOpen, setIsOpen] = useState(false)
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false)

  const isDeleted = Boolean(quack.deletedAt)
  const isOwner = Boolean(currentUserId && currentUserId === quack.userId)
  const isAdmin = currentUserRole === "admin"
  const canDelete = !isDeleted && (isOwner || isAdmin)

  const { name, username } = quack.user

  const initials = isDeleted
    ? "?"
    : name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

  const handleDelete = async () => {
    try {
      await deleteQuackMutation.mutateAsync(quack.id)
      setIsOpen(false)
    } catch {
      // error handled by mutation
    }
  }

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback className={isDeleted ? "text-muted-foreground" : ""}>
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            {isDeleted ? (
              <span className="text-xs text-muted-foreground italic">[deleted]</span>
            ) : (
              <span>
                <UsersName name={name} /> <UsersUserName username={username} />
              </span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
            {!isDeleted && quack.mood ? (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <QuackMoodLabel mood={quack.mood} />
              </>
            ) : null}
          </div>

          {canDelete ? (
            <Dialog
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete quack"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only sm:not-sr-only">Delete</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete quack?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this quack? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={deleteQuackMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteQuackMutation.isPending}
                  >
                    {deleteQuackMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        {isDeleted ? (
          <p className="text-sm text-muted-foreground italic">[This quack was deleted]</p>
        ) : (
          <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        )}

        {!isDeleted && quack.poll ? (
          <QuackPoll
            quackId={quack.id}
            authorId={quack.userId}
            currentUserId={currentUserId}
            poll={quack.poll}
          />
        ) : null}

        <div className="mt-2 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsRepliesExpanded((prev) => !prev)}
            aria-label={isRepliesExpanded ? "Hide replies" : "Show replies"}
          >
            <MessageSquare className="size-4" />
            <span className="text-xs">
              {quack.replyCount ?? 0} {(quack.replyCount ?? 0) === 1 ? "reply" : "replies"}
            </span>
          </Button>
        </div>

        {isRepliesExpanded ? (
          <ReplySection
            parentId={quack.id}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        ) : null}
      </div>
    </article>
  )
}
