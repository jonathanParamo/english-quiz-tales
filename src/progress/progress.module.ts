import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProgressSchema, PracticeSessionSchema } from './progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Progress', schema: ProgressSchema },
      { name: 'PracticeSession', schema: PracticeSessionSchema },
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
