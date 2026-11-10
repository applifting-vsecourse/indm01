import { api } from "@/lib/api-client"

import { quacksSchema, type Quack } from "@/features/quack/api/quackSchemas"

export async function getReplies(parentId: string): Promise<Quack[]> {
  const json = await api.get(`quacks/${parentId}/replies`).json()
  return quacksSchema.parse(json)
}
