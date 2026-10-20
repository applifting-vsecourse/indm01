import { Poll } from '@/modules/quack/domain/quack';
import {
  PollForVoting,
  PollRepository,
} from '@/modules/quack/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class PollVotesService {
  constructor(private readonly pollRepository: PollRepository) {}

  /** Casts the user's vote, or moves it to another answer. */
  async vote(user: Identity, quackId: string, answerId: string): Promise<Poll> {
    const poll = await this.getPollOpenToVoter(user, quackId);
    if (!poll.answerIds.includes(answerId)) {
      throw new BadRequestException('That answer is not part of this poll');
    }

    await this.pollRepository.upsertVote({
      pollId: poll.id,
      answerId,
      userId: user.id,
    });
    return this.pollRepository.getPollForViewer(poll.id, user.id);
  }

  /** Removes the user's vote, if there is one. */
  async removeVote(user: Identity, quackId: string): Promise<Poll> {
    const poll = await this.getPollOpenToVoter(user, quackId);

    await this.pollRepository.deleteVote({
      pollId: poll.id,
      userId: user.id,
    });
    return this.pollRepository.getPollForViewer(poll.id, user.id);
  }

  private async getPollOpenToVoter(
    user: Identity,
    quackId: string,
  ): Promise<PollForVoting> {
    const poll = await this.pollRepository.findPollForVoting(quackId);
    if (!poll) {
      throw new NotFoundException('There is no poll on this quack');
    }
    if (poll.authorId === user.id) {
      throw new ForbiddenException('You cannot vote in your own poll');
    }
    if (poll.closesAt.getTime() <= Date.now()) {
      throw new ConflictException('This poll has closed.');
    }
    return poll;
  }
}
