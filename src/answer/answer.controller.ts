import { Controller, Post, Body } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('answers')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post('submit')
  async submitAnswer(@Body() dto: SubmitAnswerDto) {
    return this.answerService.gradeAnswer(
      dto.questionId,
      dto.userId,
      dto.selectedOption,
    );
  }
}
