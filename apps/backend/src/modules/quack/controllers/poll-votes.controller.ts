import { PollVotesService } from '@/modules/quack/services/poll-votes.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Param,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PollResponseDto } from './dto/poll.response.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('quacks')
@Controller('quacks/:quackId/poll/vote')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@ApiParam({ name: 'quackId', description: 'The quack that carries the poll' })
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PollVotesController {
  constructor(private readonly pollVotesService: PollVotesService) {}

  @Put()
  @ApiOperation({
    summary: 'Vote in a poll, or move your vote to another answer',
  })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 400, description: 'Answer is not part of this poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'You wrote this poll' })
  @ApiResponse({ status: 404, description: 'No such quack, or it has no poll' })
  @ApiResponse({ status: 409, description: 'The poll has closed' })
  async vote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: VoteDto,
  ): Promise<PollResponseDto> {
    const poll = await this.pollVotesService.vote(user, quackId, body.answerId);
    return PollResponseDto.fromDomain(poll);
  }

  @Delete()
  @ApiOperation({ summary: 'Take back your vote in a poll' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'You wrote this poll' })
  @ApiResponse({ status: 404, description: 'No such quack, or it has no poll' })
  @ApiResponse({ status: 409, description: 'The poll has closed' })
  async removeVote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<PollResponseDto> {
    const poll = await this.pollVotesService.removeVote(user, quackId);
    return PollResponseDto.fromDomain(poll);
  }
}
