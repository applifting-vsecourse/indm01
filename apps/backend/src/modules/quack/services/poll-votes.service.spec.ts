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
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { PollVotesService } from './poll-votes.service';

const NOW = new Date('2026-10-13T12:00:00Z');

const aPollForVoting = (
  overrides: Partial<PollForVoting> = {},
): PollForVoting => ({
  id: 'p1',
  closesAt: new Date('2026-10-14T12:00:00Z'),
  authorId: 'author',
  answerIds: ['a1', 'a2'],
  ...overrides,
});

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  closesAt: new Date('2026-10-14T12:00:00Z'),
  isClosed: false,
  totalVotes: 1,
  myAnswerId: 'a1',
  answers: [
    { id: 'a1', text: 'Pizza', votes: 1 },
    { id: 'a2', text: 'Thai', votes: 0 },
  ],
  ...overrides,
});

describe('PollVotesService', () => {
  const voter = { id: 'voter' } as Identity;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('vote', () => {
    it('casts the vote and returns the poll as the voter sees it', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      const updated = aPoll();
      repository.getPollForViewer.mockResolvedValue(updated);
      const service = new PollVotesService(repository);

      await expect(service.vote(voter, 'q1', 'a1')).resolves.toEqual(updated);

      expect(repository.findPollForVoting).toHaveBeenCalledWith('q1');
      // the voter comes from the session, never from the request
      expect(repository.upsertVote).toHaveBeenCalledWith({
        pollId: 'p1',
        answerId: 'a1',
        userId: 'voter',
      });
      expect(repository.getPollForViewer).toHaveBeenCalledWith('p1', 'voter');
    });

    it('moves an existing vote by upserting the other answer', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      repository.getPollForViewer.mockResolvedValue(aPoll());
      const service = new PollVotesService(repository);

      await service.vote(voter, 'q1', 'a2');

      expect(repository.upsertVote).toHaveBeenCalledWith({
        pollId: 'p1',
        answerId: 'a2',
        userId: 'voter',
      });
    });

    it('accepts the same vote twice', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      repository.getPollForViewer.mockResolvedValue(aPoll());
      const service = new PollVotesService(repository);

      await service.vote(voter, 'q1', 'a1');
      await expect(service.vote(voter, 'q1', 'a1')).resolves.toBeDefined();
    });

    it('answers 404 when the quack has no poll', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(null);
      const service = new PollVotesService(repository);

      await expect(service.vote(voter, 'q1', 'a1')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });

    it('answers 403 when the author votes in their own poll', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      const service = new PollVotesService(repository);

      await expect(
        service.vote({ id: 'author' } as Identity, 'q1', 'a1'),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });

    it('answers 409 once the poll has closed', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(
        aPollForVoting({ closesAt: new Date('2026-10-13T11:59:59Z') }),
      );
      const service = new PollVotesService(repository);

      await expect(service.vote(voter, 'q1', 'a1')).rejects.toThrow(
        new ConflictException('This poll has closed.'),
      );
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });

    it('treats the exact closing moment as closed', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(
        aPollForVoting({ closesAt: NOW }),
      );
      const service = new PollVotesService(repository);

      await expect(service.vote(voter, 'q1', 'a1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('answers 400 for an answer that belongs to another poll', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      const service = new PollVotesService(repository);

      await expect(
        service.vote(voter, 'q1', 'answer-of-another-poll'),
      ).rejects.toThrow(BadRequestException);
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });
  });

  describe('removeVote', () => {
    it('removes the vote and returns the poll as the voter sees it', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      const updated = aPoll({ myAnswerId: null, totalVotes: 0 });
      repository.getPollForViewer.mockResolvedValue(updated);
      const service = new PollVotesService(repository);

      await expect(service.removeVote(voter, 'q1')).resolves.toEqual(updated);

      expect(repository.deleteVote).toHaveBeenCalledWith({
        pollId: 'p1',
        userId: 'voter',
      });
    });

    it('answers 404 when the quack has no poll', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(null);
      const service = new PollVotesService(repository);

      await expect(service.removeVote(voter, 'q1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('answers 403 for the author', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(aPollForVoting());
      const service = new PollVotesService(repository);

      await expect(
        service.removeVote({ id: 'author' } as Identity, 'q1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('answers 409 once the poll has closed', async () => {
      const repository = mock<PollRepository>();
      repository.findPollForVoting.mockResolvedValue(
        aPollForVoting({ closesAt: new Date('2026-10-13T11:00:00Z') }),
      );
      const service = new PollVotesService(repository);

      await expect(service.removeVote(voter, 'q1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.deleteVote).not.toHaveBeenCalled();
    });
  });
});
