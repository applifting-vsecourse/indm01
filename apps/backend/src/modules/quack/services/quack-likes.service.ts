import { QuackLiker, QuackLikeStatus } from '@/modules/quack/domain/quack';
import { QuackLikeRepository } from '@/modules/quack/repositories/quack-like.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class QuackLikesService {
  constructor(private readonly quackLikeRepository: QuackLikeRepository) {}

  async likeQuack(user: Identity, quackId: string): Promise<QuackLikeStatus> {
    await this.ensureActiveQuack(quackId);
    await this.quackLikeRepository.addLike(quackId, user.id);
    return this.quackLikeRepository.getLikeStatus(quackId, user.id);
  }

  async unlikeQuack(user: Identity, quackId: string): Promise<QuackLikeStatus> {
    await this.ensureActiveQuack(quackId);
    await this.quackLikeRepository.removeLike(quackId, user.id);
    return this.quackLikeRepository.getLikeStatus(quackId, user.id);
  }

  async getLikers(quackId: string): Promise<QuackLiker[]> {
    await this.ensureActiveQuack(quackId);
    return this.quackLikeRepository.getLikers(quackId);
  }

  async clearLikesForQuack(quackId: string): Promise<void> {
    await this.quackLikeRepository.deleteLikesForQuack(quackId);
  }

  private async ensureActiveQuack(quackId: string): Promise<void> {
    const quack = await this.quackLikeRepository.findTargetQuack(quackId);
    if (!quack || quack.deletedAt) {
      throw new NotFoundException('Quack not found');
    }
  }
}
