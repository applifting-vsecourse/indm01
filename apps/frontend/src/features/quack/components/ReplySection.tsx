import { Button } from "@/components/ui/button"

import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyItem } from "@/features/quack/components/ReplyItem"
import { useReplies } from "@/features/quack/hooks/useReplies"

type ReplySectionProps = {
  parentId: string
  currentUserId?: string
  currentUserRole?: string
}

export function ReplySection({ parentId, currentUserId, currentUserRole }: ReplySectionProps) {
  const { data: replies, isLoading, isError, refetch } = useReplies(parentId)

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      {currentUserId ? <ReplyForm parentId={parentId} /> : null}

      <div className="flex flex-col gap-1">
        {isLoading ? (
          <p className="py-2 text-xs text-muted-foreground">Loading replies...</p>
        ) : isError ? (
          <div className="flex items-center gap-2 py-2">
            <p className="text-xs text-destructive">Failed to load replies.</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : replies && replies.length > 0 ? (
          <div className="flex flex-col">
            {replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        ) : (
          <p className="py-2 text-xs text-muted-foreground">
            No replies yet. Be the first to reply!
          </p>
        )}
      </div>
    </div>
  )
}
