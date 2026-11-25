import { QuackLiker, QuackLikeStatus } from '@/modules/quack/domain/quack';
import { QuackLikeRepository } from '@/modules/quack/repositories/quack-like.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuackLikesService {
  constructor(private readonly quackLikeRepository: QuackLikeRepository) {}

  async likeQuack(user: Identity, quackId: string): Promise<QuackLikeStatus> {
    void user;
    void quackId;
    void this.quackLikeRepository;
    throw new Error('not implemented');
  }

  async unlikeQuack(user: Identity, quackId: string): Promise<QuackLikeStatus> {
    void user;
    void quackId;
    throw new Error('not implemented');
  }

  async getLikers(quackId: string): Promise<QuackLiker[]> {
    void quackId;
    throw new Error('not implemented');
  }

  async clearLikesForQuack(quackId: string): Promise<void> {
    void quackId;
    throw new Error('not implemented');
  }
}
