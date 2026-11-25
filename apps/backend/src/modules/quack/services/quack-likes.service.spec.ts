import {
  LikeTargetQuack,
  QuackLikeRepository,
} from '@/modules/quack/repositories/quack-like.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuackLikesService } from './quack-likes.service';

const anActiveQuack = (
  overrides: Partial<LikeTargetQuack> = {},
): LikeTargetQuack => ({
  id: 'q1',
  userId: 'author-1',
  parentId: null,
  deletedAt: null,
  ...overrides,
});

describe('QuackLikesService', () => {
  const userA = { id: 'user-a', role: 'user' } as Identity;
  const author = { id: 'author-1', role: 'user' } as Identity;

  it('R1: likes an active quack and returns updated count and likedByMe=true', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(anActiveQuack());
    repo.addLike.mockResolvedValue();
    repo.getLikeStatus.mockResolvedValue({ likeCount: 1, likedByMe: true });

    const service = new QuackLikesService(repo);
    const result = await service.likeQuack(userA, 'q1');

    expect(result).toEqual({ likeCount: 1, likedByMe: true });
    expect(repo.addLike).toHaveBeenCalledWith('q1', 'user-a');
    expect(repo.getLikeStatus).toHaveBeenCalledWith('q1', 'user-a');
  });

  it('R2: allows an author to like their own quack', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(anActiveQuack({ userId: author.id }));
    repo.addLike.mockResolvedValue();
    repo.getLikeStatus.mockResolvedValue({ likeCount: 1, likedByMe: true });

    const service = new QuackLikesService(repo);
    const result = await service.likeQuack(author, 'q1');

    expect(result).toEqual({ likeCount: 1, likedByMe: true });
    expect(repo.addLike).toHaveBeenCalledWith('q1', author.id);
  });

  it('R3: allows liking a reply', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(
      anActiveQuack({ id: 'r1', parentId: 'q1' }),
    );
    repo.addLike.mockResolvedValue();
    repo.getLikeStatus.mockResolvedValue({ likeCount: 1, likedByMe: true });

    const service = new QuackLikesService(repo);
    const result = await service.likeQuack(userA, 'r1');

    expect(result).toEqual({ likeCount: 1, likedByMe: true });
    expect(repo.addLike).toHaveBeenCalledWith('r1', 'user-a');
  });

  it('R4: liking the same quack twice is idempotent', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(anActiveQuack());
    repo.addLike.mockResolvedValue();
    repo.getLikeStatus.mockResolvedValue({ likeCount: 1, likedByMe: true });

    const service = new QuackLikesService(repo);
    const first = await service.likeQuack(userA, 'q1');
    const second = await service.likeQuack(userA, 'q1');

    expect(first).toEqual({ likeCount: 1, likedByMe: true });
    expect(second).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('R5: unliking a liked quack removes the like and returns likedByMe=false', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(anActiveQuack());
    repo.removeLike.mockResolvedValue();
    repo.getLikeStatus.mockResolvedValue({ likeCount: 0, likedByMe: false });

    const service = new QuackLikesService(repo);
    const result = await service.unlikeQuack(userA, 'q1');

    expect(result).toEqual({ likeCount: 0, likedByMe: false });
    expect(repo.removeLike).toHaveBeenCalledWith('q1', 'user-a');
    expect(repo.getLikeStatus).toHaveBeenCalledWith('q1', 'user-a');
  });

  it('R6: unliking a quack not liked by the user is idempotent', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(anActiveQuack());
    repo.removeLike.mockResolvedValue();
    repo.getLikeStatus.mockResolvedValue({ likeCount: 1, likedByMe: false });

    const service = new QuackLikesService(repo);
    const result = await service.unlikeQuack(userA, 'q1');

    expect(result).toEqual({ likeCount: 1, likedByMe: false });
    expect(repo.removeLike).toHaveBeenCalledWith('q1', 'user-a');
  });

  it('R7: liking or unliking a non-existent quack throws NotFoundException', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(null);

    const service = new QuackLikesService(repo);

    await expect(service.likeQuack(userA, 'missing')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.unlikeQuack(userA, 'missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.addLike).not.toHaveBeenCalled();
    expect(repo.removeLike).not.toHaveBeenCalled();
  });

  it('R8: liking or unliking a deleted tombstone quack throws NotFoundException', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(
      anActiveQuack({ deletedAt: new Date('2026-11-24T12:00:00Z') }),
    );

    const service = new QuackLikesService(repo);

    await expect(service.likeQuack(userA, 'q1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.unlikeQuack(userA, 'q1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.addLike).not.toHaveBeenCalled();
    expect(repo.removeLike).not.toHaveBeenCalled();
  });

  it('R9: lists likers of an active quack in repository order (most recent first)', async () => {
    const likers = [
      { id: 'user-b', name: 'User B', username: 'userb' },
      { id: 'user-a', name: 'User A', username: 'usera' },
    ];
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValue(anActiveQuack());
    repo.getLikers.mockResolvedValue(likers);

    const service = new QuackLikesService(repo);

    await expect(service.getLikers('q1')).resolves.toEqual(likers);
    expect(repo.getLikers).toHaveBeenCalledWith('q1');
  });

  it('R10: listing likers of a non-existent or tombstone quack throws NotFoundException', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.findTargetQuack.mockResolvedValueOnce(null);
    repo.findTargetQuack.mockResolvedValueOnce(
      anActiveQuack({ deletedAt: new Date('2026-11-24T12:00:00Z') }),
    );

    const service = new QuackLikesService(repo);

    await expect(service.getLikers('missing')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.getLikers('q1')).rejects.toThrow(NotFoundException);
    expect(repo.getLikers).not.toHaveBeenCalled();
  });

  it('R11: clears likes for a quack when converted to a tombstone', async () => {
    const repo = mock<QuackLikeRepository>();
    repo.deleteLikesForQuack.mockResolvedValue();

    const service = new QuackLikesService(repo);
    await expect(service.clearLikesForQuack('q1')).resolves.toBeUndefined();
    expect(repo.deleteLikesForQuack).toHaveBeenCalledWith('q1');
  });
});
