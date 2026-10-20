// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, Logger } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.getQuacks(user)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    // the viewer's id is passed on so the repository can load their poll votes
    expect(repository.getQuacks).toHaveBeenCalledWith('u1');
  });

  describe('search', () => {
    let log: jest.SpyInstance;

    beforeEach(() => {
      log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      log.mockRestore();
    });

    it('splits the search into words and drops a leading @', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuacks.mockResolvedValue([]);
      const service = new QuacksService(repository);

      await service.getQuacks(
        { id: 'u1' } as Identity,
        '  pond   @CaffeinatedDuck ',
      );

      expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
        words: ['pond', 'CaffeinatedDuck'],
      });
    });

    it.each(['', '   ', '@', ' @ @ '])(
      'treats %j as no search and logs nothing',
      async (search) => {
        const repository = mock<QuackRepository>();
        repository.getQuacks.mockResolvedValue([]);
        const service = new QuacksService(repository);

        await service.getQuacks({ id: 'u1' } as Identity, search);

        expect(repository.getQuacks).toHaveBeenCalledWith('u1');
        expect(log).not.toHaveBeenCalled();
      },
    );

    it('logs each search with who searched and how many quacks matched', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuacks.mockResolvedValue([aQuack(), aQuack({ id: 'q2' })]);
      const service = new QuacksService(repository);

      await service.getQuacks({ id: 'u1' } as Identity, ' pond ');

      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
        event: 'quack_search',
        userId: 'u1',
        query: 'pond',
        resultCount: 2,
      });
    });
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: null,
      userId: 'u1',
      poll: undefined,
    });
  });

  it('stores the mood the author picked', async () => {
    const created = aQuack({ id: 'q3', text: 'bread!', mood: 'silly' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'bread!', mood: 'silly' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'bread!',
      mood: 'silly',
      userId: 'u1',
      poll: undefined,
    });
  });

  describe('creating a poll', () => {
    const user = { id: 'u1' } as Identity;
    const now = new Date('2026-10-13T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      ['1h', new Date('2026-10-13T13:00:00Z')],
      ['1d', new Date('2026-10-14T12:00:00Z')],
      ['1w', new Date('2026-10-20T12:00:00Z')],
    ] as const)(
      'closes a %s poll at the time the server works out',
      async (duration, closesAt) => {
        const repository = mock<QuackRepository>();
        repository.createQuack.mockResolvedValue(aQuack());
        const service = new QuacksService(repository);

        await service.createQuack(user, {
          text: 'Lunch?',
          poll: { answers: ['Pizza', 'Thai'], duration },
        });

        expect(repository.createQuack).toHaveBeenCalledWith({
          text: 'Lunch?',
          mood: null,
          userId: 'u1',
          poll: { answers: ['Pizza', 'Thai'], closesAt },
        });
      },
    );

    it('stores the answers trimmed', async () => {
      const repository = mock<QuackRepository>();
      repository.createQuack.mockResolvedValue(aQuack());
      const service = new QuacksService(repository);

      await service.createQuack(user, {
        text: 'Lunch?',
        poll: { answers: ['  Pizza ', 'Thai'], duration: '1d' },
      });

      expect(repository.createQuack).toHaveBeenCalledWith(
        expect.objectContaining({
          poll: expect.objectContaining({ answers: ['Pizza', 'Thai'] }),
        }),
      );
    });

    it.each([
      [['Pizza', 'Pizza']],
      [['Pizza', ' pizza ']],
      [['Pizza', 'Thai', 'PIZZA']],
    ])('rejects duplicate answers %j', async (answers) => {
      const repository = mock<QuackRepository>();
      const service = new QuacksService(repository);

      await expect(
        service.createQuack(user, {
          text: 'Lunch?',
          poll: { answers, duration: '1d' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createQuack).not.toHaveBeenCalled();
    });
  });

  describe('deleteQuack', () => {
    it('deletes the quack when owned by user', async () => {
      const existing = aQuack({ id: 'q1', userId: 'u1' });
      const repository = mock<QuackRepository>();
      repository.getQuackById.mockResolvedValue(existing);
      repository.deleteQuack.mockResolvedValue();

      const service = new QuacksService(repository);
      const user = { id: 'u1' } as Identity;

      await expect(service.deleteQuack(user, 'q1')).resolves.toBeUndefined();
      expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
    });

    it('rejects with ForbiddenException when trying to delete someone else quack', async () => {
      const existing = aQuack({ id: 'q1', userId: 'other-user' });
      const repository = mock<QuackRepository>();
      repository.getQuackById.mockResolvedValue(existing);

      const service = new QuacksService(repository);
      const user = { id: 'u1' } as Identity;

      await expect(service.deleteQuack(user, 'q1')).rejects.toThrow(
        'You can only delete your own quacks',
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('rejects with NotFoundException when quack does not exist', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackById.mockResolvedValue(null);

      const service = new QuacksService(repository);
      const user = { id: 'u1' } as Identity;

      await expect(service.deleteQuack(user, 'q999')).rejects.toThrow(
        'Quack not found',
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });
  });
});
