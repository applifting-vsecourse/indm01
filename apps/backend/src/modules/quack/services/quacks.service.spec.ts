// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Logger } from '@nestjs/common';
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
    expect(repository.getQuacks).toHaveBeenCalledWith();
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

      expect(repository.getQuacks).toHaveBeenCalledWith({
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

        expect(repository.getQuacks).toHaveBeenCalledWith();
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
    });
  });
});
