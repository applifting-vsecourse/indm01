import { Poll } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class PollAnswerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'How many people picked this answer' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  closesAt!: Date;

  @ApiProperty({
    description:
      'True once the poll has closed, by the server clock. Closed polls take no votes.',
  })
  isClosed!: boolean;

  @ApiProperty({ description: 'Votes across all answers' })
  totalVotes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The answer the requesting user picked, if any',
  })
  myAnswerId!: string | null;

  @ApiProperty({
    type: [PollAnswerDto],
    description: 'In the order the author wrote them',
  })
  answers!: PollAnswerDto[];

  static fromDomain(poll: Poll): PollResponseDto {
    return {
      id: poll.id,
      closesAt: poll.closesAt,
      isClosed: poll.isClosed,
      totalVotes: poll.totalVotes,
      myAnswerId: poll.myAnswerId,
      answers: poll.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        votes: answer.votes,
      })),
    };
  }
}
