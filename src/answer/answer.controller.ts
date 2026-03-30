import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AnswerService } from './answer.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// ✅ FIX: ahora llama a submitAnswer() en vez de gradeAnswer() (que fue eliminado por duplicado)
// ✅ Se agregaron los endpoints de consulta que ya existían en el servicio pero no tenían rutas

@Controller('answers')
@UseGuards(JwtAuthGuard)
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  // POST /api/v1/answers/submit
  @Post('submit')
  async submitAnswer(@Body() dto: SubmitAnswerDto) {
    return this.answerService.submitAnswer({
      questionId: dto.questionId,
      userId: dto.userId,
      selectedOption: dto.selectedOption,
    });
  }

  // GET /api/v1/answers/user/:userId
  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.answerService.findAllByUser(userId);
  }

  // GET /api/v1/answers/score/:userId/:storyId
  @Get('score/:userId/:storyId')
  async getScore(
    @Param('userId') userId: string,
    @Param('storyId') storyId: string,
  ) {
    return this.answerService.getScoreByStory(userId, storyId);
  }

  // DELETE /api/v1/answers/:id
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.answerService.delete(id);
  }
}
