import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserSettingsDto {
  @ApiProperty({
    description: 'Display name',
    example: 'Caffeinated Duck',
  })
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description:
      'Username (3–30 characters: letters, numbers, dots and underscores)',
    example: 'CaffeinatedDuck',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'Username can only contain letters, numbers, dots and underscores',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'Short bio (at most 160 characters)',
    maxLength: 160,
    nullable: true,
    example: 'A duck that loves coffee and coding.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160, { message: 'Bio must be at most 160 characters' })
  bio?: string | null;

  @ApiPropertyOptional({
    description: 'Default mood for new posts',
    enum: QUACK_MOODS,
    nullable: true,
    example: 'happy',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(QUACK_MOODS, { message: 'Invalid mood' })
  defaultMood?: QuackMood | null;
}
