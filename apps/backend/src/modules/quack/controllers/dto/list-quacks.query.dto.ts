import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListQuacksQueryDto {
  @ApiPropertyOptional({
    description:
      'Search words. A quack matches when every word appears in its text, author name or username (case-insensitive).',
    example: 'pond @CaffeinatedDuck',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
