import { api } from "@/lib/api-client"

import {
  quackSchema,
  type PollDuration,
  type Quack,
  type QuackMood,
} from "@/features/quack/api/quackSchemas"

export type NewPoll = { answers: string[]; duration: PollDuration }

export async function addQuack(input: {
  text: string
  mood?: QuackMood | null
  poll?: NewPoll
  parentId?: string | null
}): Promise<Quack> {
  const json = await api.post("quacks", { json: input }).json()
  return quackSchema.parse(json)
}
