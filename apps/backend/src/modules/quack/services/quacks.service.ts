import {
  POLL_DURATIONS,
  PollDuration,
  Quack,
  QuackMood,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

// "@CaffeinatedDuck" is how usernames are shown, so people type them that way.
const toSearchWords = (search: string): string[] =>
  search
    .split(/\s+/)
    .map((word) => word.replace(/^@/, ''))
    .filter(Boolean);

const MINUTE_IN_MS = 60 * 1000;
const POLL_DURATION_IN_MS: Record<PollDuration, number> = {
  '1h': 60 * MINUTE_IN_MS,
  '1d': 24 * 60 * MINUTE_IN_MS,
  '1w': 7 * 24 * 60 * MINUTE_IN_MS,
};

@Injectable()
export class QuacksService {
  private readonly logger = new Logger(QuacksService.name);

  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(user: Identity, search?: string): Promise<Quack[]> {
    const words = toSearchWords(search ?? '');
    if (words.length === 0) {
      return this.quackRepository.getQuacks(user.id);
    }

    const quacks = await this.quackRepository.getQuacks(user.id, { words });
    // One line per search, so we can tell whether people use it at all
    // and how often they come up empty.
    this.logger.log(
      JSON.stringify({
        event: 'quack_search',
        userId: user.id,
        query: search?.trim(),
        resultCount: quacks.length,
      }),
    );
    return quacks;
  }

  async createQuack(
    user: Identity,
    quackData: {
      text: string;
      mood?: QuackMood | null;
      poll?: { answers: string[]; duration: PollDuration } | null;
    },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood ?? null,
      // the author is taken from the session, never from the request body
      userId: user.id,
      poll: quackData.poll ? this.toNewPoll(quackData.poll) : undefined,
    });
  }

  private toNewPoll(poll: { answers: string[]; duration: PollDuration }): {
    answers: string[];
    closesAt: Date;
  } {
    const answers = poll.answers.map((answer) => answer.trim());
    // Identical answers would split the votes between look-alikes.
    const distinct = new Set(answers.map((answer) => answer.toLowerCase()));
    if (distinct.size !== answers.length) {
      throw new BadRequestException('Answers must be different');
    }
    if (!POLL_DURATIONS.includes(poll.duration)) {
      throw new BadRequestException('Unknown poll length');
    }
    return {
      answers,
      // Computed here, once; "closed" is simply closesAt <= now from then on.
      closesAt: new Date(Date.now() + POLL_DURATION_IN_MS[poll.duration]),
    };
  }
}
