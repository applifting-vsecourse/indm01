import { useEffect, useState } from "react"

import type { Poll } from "@/features/quack/api/quackSchemas"

const MINUTE_MS = 60_000
// The largest delay setTimeout accepts (a signed 32-bit integer, about 24.8 days).
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * Closed once the server says so, or once the deadline passes on this clock —
 * a timer set to the deadline flips the poll at that moment, without waiting
 * for a refetch. The server still rejects late votes, and a 409 marks the poll
 * closed in the cache, which covers a clock that runs slow.
 */
export function usePollClosed(poll: Pick<Poll, "closesAt" | "isClosed">) {
  const [now, setNow] = useState(() => Date.now())
  const closesAt = poll.closesAt.getTime()

  useEffect(() => {
    if (poll.isClosed || closesAt <= Date.now()) return

    // max(): a timer can fire a millisecond early, which would leave the poll open.
    // A delay past the 32-bit limit would fire at once instead of late, so a
    // deadline that far away is left to the once-a-minute tick below.
    const delay = closesAt - Date.now()
    const deadline =
      delay <= MAX_TIMEOUT_MS
        ? setTimeout(() => setNow(Math.max(Date.now(), closesAt)), delay)
        : undefined
    // The countdown text only has minute resolution.
    const tick = setInterval(() => setNow(Date.now()), MINUTE_MS)
    return () => {
      clearTimeout(deadline)
      clearInterval(tick)
    }
  }, [poll.isClosed, closesAt])

  return {
    isClosed: poll.isClosed || now >= closesAt,
    msLeft: Math.max(0, closesAt - now),
  }
}
