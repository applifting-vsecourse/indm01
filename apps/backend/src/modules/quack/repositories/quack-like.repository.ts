import { PrismaService } from '@/core/prisma/prisma.service';
import { QuackLiker, QuackLikeStatus } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

export type LikeTargetQuack = {
  id: string;
  userId: string;
  parentId: string | null;
  deletedAt: Date | null;
};

@Injectable()
export class QuackLikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTargetQuack(quackId: string): Promise<LikeTargetQuack | null> {
    return this.prisma.quack.findUnique({
      where: { id: quackId },
      select: {
        id: true,
        userId: true,
        parentId: true,
        deletedAt: true,
      },
    });
  }

  async addLike(quackId: string, userId: string): Promise<void> {
    await this.prisma.quackLike.createMany({
      data: [{ quackId, userId }],
      skipDuplicates: true,
    });
  }

  async removeLike(quackId: string, userId: string): Promise<void> {
    await this.prisma.quackLike.deleteMany({
      where: { quackId, userId },
    });
  }

  async getLikeStatus(
    quackId: string,
    viewerId: string,
  ): Promise<QuackLikeStatus> {
    const [likeCount, viewerLike] = await Promise.all([
      this.prisma.quackLike.count({
        where: { quackId },
      }),
      this.prisma.quackLike.findUnique({
        where: {
          quackId_userId: { quackId, userId: viewerId },
        },
        select: { id: true },
      }),
    ]);

    return {
      likeCount,
      likedByMe: Boolean(viewerLike),
    };
  }

  async getLikers(quackId: string): Promise<QuackLiker[]> {
    const likes = await this.prisma.quackLike.findMany({
      where: { quackId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return likes.map((like) => ({
      id: like.user.id,
      name: like.user.name,
      username: like.user.username ?? '',
    }));
  }

  async deleteLikesForQuack(quackId: string): Promise<void> {
    await this.prisma.quackLike.deleteMany({
      where: { quackId },
    });
  }
}
