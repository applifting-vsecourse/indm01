import { Prisma } from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/quack';

type PollViewInclude = {
  answers: {
    orderBy: { position: 'asc' };
    include: { _count: { select: { votes: true } } };
  };
  votes: { where: { userId: string }; select: { answerId: true } };
};

/**
 * What a poll needs to be shown to one viewer: its answers in the order the
 * author typed them, a vote count per answer, and the viewer's own vote.
 * Counts are never stored — they are always counted from the vote rows.
 */
export const pollInclude = (viewerId: string): PollViewInclude => ({
  answers: {
    orderBy: { position: 'asc' },
    include: { _count: { select: { votes: true } } },
  },
  votes: { where: { userId: viewerId }, select: { answerId: true } },
});

export type PrismaPollForViewer = Prisma.PollGetPayload<{
  include: PollViewInclude;
}>;

export const mapPrismaPollToDomain = (
  poll: PrismaPollForViewer,
  now: Date = new Date(),
): Poll => {
  const answers = poll.answers.map((answer) => ({
    id: answer.id,
    text: answer.text,
    votes: answer._count.votes,
  }));

  return {
    id: poll.id,
    closesAt: poll.closesAt,
    // The server's clock is the authority on whether a poll still takes votes.
    isClosed: poll.closesAt.getTime() <= now.getTime(),
    totalVotes: answers.reduce((total, answer) => total + answer.votes, 0),
    myAnswerId: poll.votes[0]?.answerId ?? null,
    answers,
  };
};
