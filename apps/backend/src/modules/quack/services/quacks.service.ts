import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable, Logger } from '@nestjs/common';

// "@CaffeinatedDuck" is how usernames are shown, so people type them that way.
const toSearchWords = (search: string): string[] =>
  search
    .split(/\s+/)
    .map((word) => word.replace(/^@/, ''))
    .filter(Boolean);

@Injectable()
export class QuacksService {
  private readonly logger = new Logger(QuacksService.name);

  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(user: Identity, search?: string): Promise<Quack[]> {
    const words = toSearchWords(search ?? '');
    if (words.length === 0) {
      return this.quackRepository.getQuacks();
    }

    const quacks = await this.quackRepository.getQuacks({ words });
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
    quackData: { text: string; mood?: QuackMood | null },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood ?? null,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
