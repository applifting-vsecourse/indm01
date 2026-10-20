import { useState } from "react"
import { Trash2 } from "lucide-react"

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

  const isOwner = Boolean(currentUserId && currentUserId === quack.userId)
  const isAdmin = currentUserRole === "admin"
  const canDelete = isOwner || isAdmin

  const { name, username } = quack.user

  const initials = name
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
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span>
              <UsersName name={name} /> <UsersUserName username={username} />
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
            {quack.mood ? (
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
        <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        {quack.poll ? (
          <QuackPoll
            quackId={quack.id}
            authorId={quack.userId}
            currentUserId={currentUserId}
            poll={quack.poll}
          />
        ) : null}
      </div>
    </article>
  )
}
