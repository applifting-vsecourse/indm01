import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/quack';
import {
  mapPrismaPollToDomain,
  pollInclude,
} from '@/modules/quack/repositories/poll.mapper';
import { Injectable } from '@nestjs/common';

/** What the voting rules need to know about a poll — no counts. */
export type PollForVoting = {
  id: string;
  closesAt: Date;
  authorId: string;
  answerIds: string[];
};

const UNIQUE_VIOLATION = 'P2002';

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_VIOLATION;

@Injectable()
export class PollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPollForVoting(quackId: string): Promise<PollForVoting | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { quackId },
      select: {
        id: true,
        closesAt: true,
        quack: { select: { userId: true } },
        answers: { select: { id: true } },
      },
    });
    if (!poll) {
      return null;
    }
    return {
      id: poll.id,
      closesAt: poll.closesAt,
      authorId: poll.quack.userId,
      answerIds: poll.answers.map((answer) => answer.id),
    };
  }

  /** Casts the vote, or moves the user's existing vote to another answer. */
  async upsertVote(vote: {
    pollId: string;
    answerId: string;
    userId: string;
  }): Promise<void> {
    const upsert = (): Promise<unknown> =>
      this.prisma.pollVote.upsert({
        where: {
          pollId_userId: { pollId: vote.pollId, userId: vote.userId },
        },
        create: vote,
        update: { answerId: vote.answerId },
      });

    try {
      await upsert();
    } catch (error) {
      // Two requests from the same user can both miss the row and both try to
      // insert it; the unique index lets one win. The second attempt finds the
      // row and updates it.
      if (!isUniqueViolation(error)) {
        throw error;
      }
      await upsert();
    }
  }

  /** Removes the user's vote. Removing a vote that doesn't exist is fine. */
  async deleteVote(vote: { pollId: string; userId: string }): Promise<void> {
    await this.prisma.pollVote.deleteMany({ where: vote });
  }

  async getPollForViewer(pollId: string, viewerId: string): Promise<Poll> {
    const poll = await this.prisma.poll.findUniqueOrThrow({
      where: { id: pollId },
      include: pollInclude(viewerId),
    });
    return mapPrismaPollToDomain(poll);
  }
}
