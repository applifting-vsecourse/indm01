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
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type ReplyItemProps = {
  reply: Quack
  currentUserId?: string
  currentUserRole?: string
}

export function ReplyItem({ reply, currentUserId, currentUserRole }: ReplyItemProps) {
  const deleteQuackMutation = useDeleteQuack()
  const [isOpen, setIsOpen] = useState(false)

  const isOwner = Boolean(currentUserId && currentUserId === reply.userId)
  const isAdmin = currentUserRole === "admin"
  const canDelete = isOwner || isAdmin

  const { name, username } = reply.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleDelete = async () => {
    try {
      await deleteQuackMutation.mutateAsync(reply.id)
      setIsOpen(false)
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="flex w-full gap-3 border-b border-border py-2 last:border-b-0">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm">
              <UsersName name={name} /> <UsersUserName username={username} />
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time>
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
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  aria-label="Delete reply"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only text-xs sm:not-sr-only">Delete</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete reply?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this reply? This action cannot be undone.
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
        <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
      </div>
    </div>
  )
}
