import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & { user?: PrismaUser },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
});

// Prisma passes `contains` through to (I)LIKE unescaped, so a search for "%"
// or "_" would otherwise match every quack.
const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * With `words`, returns only quacks where every word appears (case-insensitive)
   * in the text, the author's name or the author's username.
   */
  async getQuacks(filter?: { words: string[] }): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: filter
        ? {
            AND: filter.words.map(escapeLikePattern).map((word) => ({
              OR: [
                { text: { contains: word, mode: 'insensitive' } },
                { user: { name: { contains: word, mode: 'insensitive' } } },
                {
                  user: { username: { contains: word, mode: 'insensitive' } },
                },
              ],
            })),
          }
        : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
      },
      include: { user: true },
    });
    return mapPrismaQuackToDomain(quack);
  }
}
