import { Quack, QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PollResponseDto } from './poll.response.dto';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({
    type: PollResponseDto,
    nullable: true,
    description: 'Set when the quack is a poll, otherwise null',
  })
  poll!: PollResponseDto | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  parentId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiPropertyOptional({ type: Number })
  replyCount?: number;

  static fromDomain(quack: Quack): QuackResponseDto {
    const isDeleted = Boolean(quack.deletedAt);
    return {
      id: quack.id,
      text: isDeleted ? '' : quack.text,
      mood: isDeleted ? null : quack.mood,
      userId: isDeleted ? '' : quack.userId,
      createdAt: quack.createdAt,
      user: isDeleted
        ? {
            id: '',
            name: 'Deleted',
            username: '',
          }
        : {
            id: quack.user?.id ?? quack.userId,
            name: quack.user?.name ?? '',
            username: quack.user?.username ?? '',
          },
      poll:
        isDeleted || !quack.poll
          ? null
          : PollResponseDto.fromDomain(quack.poll),
      parentId: quack.parentId ?? null,
      deletedAt: quack.deletedAt ?? null,
      replyCount: quack.replyCount ?? 0,
    };
  }
}
