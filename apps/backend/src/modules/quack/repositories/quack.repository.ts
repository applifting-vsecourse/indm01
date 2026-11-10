import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import {
  mapPrismaPollToDomain,
  pollInclude,
  PrismaPollForViewer,
} from '@/modules/quack/repositories/poll.mapper';
import { Injectable } from '@nestjs/common';

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser;
    poll?: PrismaPollForViewer | null;
    _count?: { replies: number };
  },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  parentId: quack.parentId,
  deletedAt: quack.deletedAt,
  replyCount: quack._count?.replies ?? 0,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
  poll: quack.poll ? mapPrismaPollToDomain(quack.poll) : null,
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
   * Returns top-level quacks.
   * With `words`, returns only active quacks where every word appears (case-insensitive)
   * in the text, author's name, author's username, or poll answers.
   */
  async getQuacks(
    viewerId: string,
    filter?: { words: string[] },
  ): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: filter
        ? {
            parentId: null,
            deletedAt: null,
            AND: filter.words.map(escapeLikePattern).map((word) => ({
              OR: [
                { text: { contains: word, mode: 'insensitive' } },
                { user: { name: { contains: word, mode: 'insensitive' } } },
                {
                  user: { username: { contains: word, mode: 'insensitive' } },
                },
                {
                  poll: {
                    answers: {
                      some: { text: { contains: word, mode: 'insensitive' } },
                    },
                  },
                },
              ],
            })),
          }
        : {
            parentId: null,
            OR: [
              { deletedAt: null },
              { replies: { some: { deletedAt: null } } },
            ],
          },
      include: {
        user: true,
        poll: { include: pollInclude(viewerId) },
        _count: {
          select: {
            replies: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async getReplies(parentId: string): Promise<Quack[]> {
    const replies = await this.prisma.quack.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return replies.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
    parentId?: string | null;
    poll?: { answers: string[]; closesAt: Date };
  }): Promise<Quack> {
    const { poll, parentId } = createQuackData;
    // One nested create: the quack, its poll and the answers are written in a
    // single transaction.
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        parent: parentId ? { connect: { id: parentId } } : undefined,
        poll: poll
          ? {
              create: {
                closesAt: poll.closesAt,
                answers: {
                  create: poll.answers.map((text, position) => ({
                    text,
                    position,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        user: true,
        poll: { include: pollInclude(createQuackData.userId) },
        _count: {
          select: {
            replies: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
    return mapPrismaQuackToDomain(quack);
  }

  async getQuackById(id: string, viewerId?: string): Promise<Quack | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id },
      include: {
        user: true,
        poll: { include: pollInclude(viewerId ?? '') },
        _count: {
          select: {
            replies: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
    return quack ? mapPrismaQuackToDomain(quack) : null;
  }

  async deleteQuack(id: string): Promise<void> {
    const activeRepliesCount = await this.prisma.quack.count({
      where: { parentId: id, deletedAt: null },
    });

    if (activeRepliesCount > 0) {
      // Tombstone: scrub content and keep row to preserve thread continuity
      await this.prisma.poll.deleteMany({
        where: { quackId: id },
      });
      await this.prisma.quack.update({
        where: { id },
        data: {
          text: '',
          mood: null,
          deletedAt: new Date(),
        },
      });
    } else {
      // Leaf quack: hard delete
      await this.prisma.quack.delete({
        where: { id },
      });
    }
  }
}
