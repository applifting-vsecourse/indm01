import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { PollVotesController } from './controllers/poll-votes.controller';
import { QuackLikesController } from './controllers/quack-likes.controller';
import { QuacksController } from './controllers/quacks.controller';
import { PollRepository } from './repositories/poll.repository';
import { QuackLikeRepository } from './repositories/quack-like.repository';
import { QuackRepository } from './repositories/quack.repository';
import { PollVotesService } from './services/poll-votes.service';
import { QuackLikesService } from './services/quack-likes.service';
import { QuacksService } from './services/quacks.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [QuacksController, PollVotesController, QuackLikesController],
  providers: [
    QuacksService,
    PollVotesService,
    QuackLikesService,
    QuackRepository,
    PollRepository,
    QuackLikeRepository,
  ],
  exports: [QuacksService],
})
export class QuackModule {}
