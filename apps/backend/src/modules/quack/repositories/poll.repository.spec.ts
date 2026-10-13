import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { PollRepository } from './poll.repository';

const vote = { pollId: 'p1', answerId: 'a1', userId: 'u1' };

const knownError = (code: string): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
  });

describe('PollRepository.upsertVote', () => {
  it('upserts on the poll and user, so a user has one vote per poll', async () => {
    const prisma = mockDeep<PrismaService>();
    const repository = new PollRepository(prisma);

    await repository.upsertVote(vote);

    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.pollVote.upsert).toHaveBeenCalledWith({
      where: { pollId_userId: { pollId: 'p1', userId: 'u1' } },
      create: vote,
      update: { answerId: 'a1' },
    });
  });

  it('retries once when a parallel request inserted the row first', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.pollVote.upsert
      .mockRejectedValueOnce(knownError('P2002'))
      .mockResolvedValueOnce({} as never);
    const repository = new PollRepository(prisma);

    await expect(repository.upsertVote(vote)).resolves.toBeUndefined();
    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(2);
  });

  it('gives up when the retry fails too', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.pollVote.upsert.mockRejectedValue(knownError('P2002'));
    const repository = new PollRepository(prisma);

    await expect(repository.upsertVote(vote)).rejects.toThrow('boom');
    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(2);
  });

  it('does not retry other errors', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.pollVote.upsert.mockRejectedValue(knownError('P2003'));
    const repository = new PollRepository(prisma);

    await expect(repository.upsertVote(vote)).rejects.toThrow('boom');
    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('PollRepository.deleteVote', () => {
  it('deletes by poll and user, and a missing vote is not an error', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.pollVote.deleteMany.mockResolvedValue({ count: 0 });
    const repository = new PollRepository(prisma);

    await expect(
      repository.deleteVote({ pollId: 'p1', userId: 'u1' }),
    ).resolves.toBeUndefined();
    expect(prisma.pollVote.deleteMany).toHaveBeenCalledWith({
      where: { pollId: 'p1', userId: 'u1' },
    });
  });
});
