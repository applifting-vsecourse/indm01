import { api } from "@/lib/api-client"

import {
  quackLikersSchema,
  quackLikeStatusSchema,
  type QuackLiker,
  type QuackLikeStatus,
} from "@/features/quack/api/quackSchemas"

export async function likeQuack(quackId: string): Promise<QuackLikeStatus> {
  const json = await api.post(`quacks/${quackId}/like`).json()
  return quackLikeStatusSchema.parse(json)
}

export async function unlikeQuack(quackId: string): Promise<QuackLikeStatus> {
  const json = await api.delete(`quacks/${quackId}/like`).json()
  return quackLikeStatusSchema.parse(json)
}

export async function getQuackLikers(quackId: string): Promise<QuackLiker[]> {
  const json = await api.get(`quacks/${quackId}/likes`).json()
  return quackLikersSchema.parse(json)
}
