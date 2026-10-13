import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

// Both endpoints answer with the updated poll, so the client can swap its
// optimistic numbers for the exact ones from the server.
export async function castVote(quackId: string, answerId: string): Promise<Poll> {
  const json = await api.put(`quacks/${quackId}/poll/vote`, { json: { answerId } }).json()
  return pollSchema.parse(json)
}

export async function removeVote(quackId: string): Promise<Poll> {
  const json = await api.delete(`quacks/${quackId}/poll/vote`).json()
  return pollSchema.parse(json)
}
