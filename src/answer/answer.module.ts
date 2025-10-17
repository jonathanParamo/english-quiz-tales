import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnswerController } from './answer.controller';
import { AnswerService } from './answer.service';
import { AnswerSchema } from './answer.schema';
import { QuestionSchema } from '../questions/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Answer', schema: AnswerSchema },
      { name: 'Question', schema: QuestionSchema },
    ]),
  ],
  controllers: [AnswerController],
  providers: [AnswerService],
})
export class AnswerModule {}
