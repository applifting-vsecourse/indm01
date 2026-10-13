import { mapPrismaPollToDomain, PrismaPollForViewer } from './poll.mapper';

const aPrismaPoll = (
  overrides: Partial<PrismaPollForViewer> = {},
): PrismaPollForViewer => ({
  id: 'p1',
  quackId: 'q1',
  closesAt: new Date('2026-10-14T12:00:00Z'),
  createdAt: new Date('2026-10-13T12:00:00Z'),
  answers: [
    {
      id: 'a1',
      pollId: 'p1',
      text: 'Pizza',
      position: 0,
      _count: { votes: 5 },
    },
    { id: 'a2', pollId: 'p1', text: 'Thai', position: 1, _count: { votes: 3 } },
    {
      id: 'a3',
      pollId: 'p1',
      text: 'Salad',
      position: 2,
      _count: { votes: 2 },
    },
  ],
  votes: [],
  ...overrides,
});

describe('mapPrismaPollToDomain', () => {
  const now = new Date('2026-10-13T13:00:00Z');

  it('counts votes per answer and sums the total', () => {
    const poll = mapPrismaPollToDomain(aPrismaPoll(), now);

    expect(poll.answers).toEqual([
      { id: 'a1', text: 'Pizza', votes: 5 },
      { id: 'a2', text: 'Thai', votes: 3 },
      { id: 'a3', text: 'Salad', votes: 2 },
    ]);
    expect(poll.totalVotes).toBe(10);
  });

  it('reports 0 votes for a poll nobody voted in', () => {
    const poll = mapPrismaPollToDomain(
      aPrismaPoll({
        answers: [
          {
            id: 'a1',
            pollId: 'p1',
            text: 'A',
            position: 0,
            _count: { votes: 0 },
          },
          {
            id: 'a2',
            pollId: 'p1',
            text: 'B',
            position: 1,
            _count: { votes: 0 },
          },
        ],
      }),
      now,
    );

    expect(poll.totalVotes).toBe(0);
  });

  it("returns the viewer's own vote, or null", () => {
    expect(mapPrismaPollToDomain(aPrismaPoll(), now).myAnswerId).toBeNull();
    expect(
      mapPrismaPollToDomain(aPrismaPoll({ votes: [{ answerId: 'a2' }] }), now)
        .myAnswerId,
    ).toBe('a2');
  });

  it('decides isClosed by the given clock', () => {
    expect(mapPrismaPollToDomain(aPrismaPoll(), now).isClosed).toBe(false);
    expect(
      mapPrismaPollToDomain(
        aPrismaPoll({ closesAt: new Date('2026-10-13T13:00:00Z') }),
        now,
      ).isClosed,
    ).toBe(true);
    expect(
      mapPrismaPollToDomain(
        aPrismaPoll({ closesAt: new Date('2026-10-13T12:00:00Z') }),
        now,
      ).isClosed,
    ).toBe(true);
  });
});
