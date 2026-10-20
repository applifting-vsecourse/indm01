import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

const check = async (
  body: unknown,
): Promise<{ dto: CreateQuackDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(CreateQuackDto, body);
  return { dto, errors: await validate(dto) };
};

const withPoll = (poll: unknown): { text: string; poll: unknown } => ({
  text: 'Lunch?',
  poll,
});

describe('CreateQuackDto poll', () => {
  it('accepts a quack without a poll', async () => {
    const { errors } = await check({ text: 'Hello' });
    expect(errors).toHaveLength(0);
  });

  it('accepts 2 to 4 answers', async () => {
    for (const answers of [
      ['A', 'B'],
      ['A', 'B', 'C'],
      ['A', 'B', 'C', 'D'],
    ]) {
      const { errors } = await check(withPoll({ answers, duration: '1d' }));
      expect(errors).toHaveLength(0);
    }
  });

  it.each([[['A']], [['A', 'B', 'C', 'D', 'E']], [[]]])(
    'rejects %j (not 2 to 4 answers)',
    async (answers) => {
      const { errors } = await check(withPoll({ answers, duration: '1d' }));
      expect(errors).not.toHaveLength(0);
    },
  );

  it('rejects an empty answer, also one that is only spaces', async () => {
    for (const answers of [
      ['A', ''],
      ['A', '   '],
    ]) {
      const { errors } = await check(withPoll({ answers, duration: '1d' }));
      expect(errors).not.toHaveLength(0);
    }
  });

  it('allows 50 characters but not 51, counted after trimming', async () => {
    const fifty = 'x'.repeat(50);
    expect(
      (await check(withPoll({ answers: ['A', fifty], duration: '1d' }))).errors,
    ).toHaveLength(0);
    expect(
      (await check(withPoll({ answers: ['A', ` ${fifty} `], duration: '1d' })))
        .errors,
    ).toHaveLength(0);
    expect(
      (await check(withPoll({ answers: ['A', fifty + 'x'], duration: '1d' })))
        .errors,
    ).not.toHaveLength(0);
  });

  it('trims the answers it hands on', async () => {
    const { dto } = await check(
      withPoll({ answers: [' Pizza ', 'Thai '], duration: '1h' }),
    );
    expect(dto.poll?.answers).toEqual(['Pizza', 'Thai']);
  });

  it('only knows the lengths 1h, 1d and 1w', async () => {
    for (const duration of ['1h', '1d', '1w']) {
      const { errors } = await check(
        withPoll({ answers: ['A', 'B'], duration }),
      );
      expect(errors).toHaveLength(0);
    }
    for (const duration of ['2d', '', undefined]) {
      const { errors } = await check(
        withPoll({ answers: ['A', 'B'], duration }),
      );
      expect(errors).not.toHaveLength(0);
    }
  });
});
