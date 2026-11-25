import { QuackLiker, QuackLikeStatus } from '@/modules/quack/domain/quack';
import { QuackLikesService } from '@/modules/quack/services/quack-likes.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('quacks')
@Controller('quacks/:quackId')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
export class QuackLikesController {
  constructor(private readonly quackLikesService: QuackLikesService) {}

  @Post('like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a quack (idempotent)' })
  async like(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<QuackLikeStatus> {
    return this.quackLikesService.likeQuack(user, quackId);
  }

  @Delete('like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove your like from a quack (idempotent)' })
  async unlike(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<QuackLikeStatus> {
    return this.quackLikesService.unlikeQuack(user, quackId);
  }

  @Get('likes')
  @ApiOperation({ summary: 'List users who liked a quack' })
  async listLikers(@Param('quackId') quackId: string): Promise<QuackLiker[]> {
    return this.quackLikesService.getLikers(quackId);
  }
}
