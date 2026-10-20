import { POLL_DURATIONS, PollDuration } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePollDto {
  @ApiProperty({
    description:
      'The answers people can pick from, in the order they are shown. Must differ from each other (case and surrounding spaces are ignored).',
    type: [String],
    minItems: 2,
    maxItems: 4,
    example: ['Pizza', 'Thai', 'Salad'],
  })
  // Trim first, so "   " counts as empty and the length limit applies to
  // what is stored.
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((answer: unknown) =>
          typeof answer === 'string' ? answer.trim() : answer,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  answers!: string[];

  @ApiProperty({
    description: 'How long the poll takes votes: 1 hour, 1 day or 1 week',
    enum: POLL_DURATIONS,
    example: '1d',
  })
  @IsIn(POLL_DURATIONS)
  duration!: PollDuration;
}
