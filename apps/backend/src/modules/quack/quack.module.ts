import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { PollVotesController } from './controllers/poll-votes.controller';
import { QuacksController } from './controllers/quacks.controller';
import { PollRepository } from './repositories/poll.repository';
import { QuackRepository } from './repositories/quack.repository';
import { PollVotesService } from './services/poll-votes.service';
import { QuacksService } from './services/quacks.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [QuacksController, PollVotesController],
  providers: [QuacksService, PollVotesService, QuackRepository, PollRepository],
  exports: [QuacksService],
})
export class QuackModule {}
