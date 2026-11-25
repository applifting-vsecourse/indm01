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
  async findTargetQuack(quackId: string): Promise<LikeTargetQuack | null> {
    void quackId;
    throw new Error('not implemented');
  }

  async addLike(quackId: string, userId: string): Promise<void> {
    void quackId;
    void userId;
    throw new Error('not implemented');
  }

  async removeLike(quackId: string, userId: string): Promise<void> {
    void quackId;
    void userId;
    throw new Error('not implemented');
  }

  async getLikeStatus(
    quackId: string,
    viewerId: string,
  ): Promise<QuackLikeStatus> {
    void quackId;
    void viewerId;
    throw new Error('not implemented');
  }

  async getLikers(quackId: string): Promise<QuackLiker[]> {
    void quackId;
    throw new Error('not implemented');
  }

  async deleteLikesForQuack(quackId: string): Promise<void> {
    void quackId;
    throw new Error('not implemented');
  }
}
