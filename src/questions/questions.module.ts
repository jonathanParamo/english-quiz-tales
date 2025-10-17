import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionSchema } from './question.schema';
import { RolesGuard } from 'src/auth/roles.guard';
import { ResultSchema } from './results.schema';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Question', schema: QuestionSchema },
      { name: 'Result', schema: ResultSchema },
    ]),
    CommonModule,
  ],
  controllers: [QuestionsController],
  exports: [QuestionsService],
  providers: [QuestionsService, RolesGuard],
})
export class QuestionsModule {}
