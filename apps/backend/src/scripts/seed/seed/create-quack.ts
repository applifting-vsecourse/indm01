import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack, User } from '@/generated/prisma/client';
import { QuackMood } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  mood?: QuackMood;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
  // Makes the quack a poll. `voters` are the users who picked that answer.
  poll?: {
    closesAt: Date;
    answers: { text: string; voters: User[] }[];
  };
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, mood, userId, createdAt, poll } = params;

  const quack = await prisma.quack.create({
    data: {
      text,
      mood,
      createdAt,
      user: {
        connect: {
          id: userId,
        },
      },
      poll: poll
        ? {
            create: {
              closesAt: poll.closesAt,
              createdAt,
              answers: {
                create: poll.answers.map(({ text: answer }, position) => ({
                  text: answer,
                  position,
                })),
              },
            },
          }
        : undefined,
    },
    include: { poll: { include: { answers: true } } },
  });

  if (poll && quack.poll) {
    const pollId = quack.poll.id;
    const answerIds = new Map(
      quack.poll.answers.map((answer) => [answer.position, answer.id]),
    );
    await prisma.pollVote.createMany({
      data: poll.answers.flatMap(({ voters }, position) =>
        voters.map((voter) => ({
          pollId,
          answerId: answerIds.get(position)!,
          userId: voter.id,
        })),
      ),
    });
  }

  return quack;
}
