import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Todos los endpoints de IA requieren estar logueado
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // POST /api/v1/ai/hint
  // Body: { question, options, correctAnswer, hintLevel?, studentLevel? }
  @Post('hint')
  async getHint(
    @Body()
    body: {
      question: string;
      options: string[];
      correctAnswer: string;
      hintLevel?: 1 | 2 | 3;
      studentLevel?: 'beginner' | 'intermediate' | 'advanced';
    },
  ) {
    return this.aiService.getHint(
      body.question,
      body.options,
      body.correctAnswer,
      body.hintLevel ?? 1,
      body.studentLevel ?? 'beginner',
    );
  }

  // POST /api/v1/ai/feedback
  // Body: { question, selectedOption, correctAnswer, studentLevel? }
  // @Post('feedback')
  // async getFeedback(
  //   @Body()
  //   body: {
  //     question: string;
  //     selectedOption: string;
  //     correctAnswer: string;
  //     studentLevel?: 'beginner' | 'intermediate' | 'advanced';
  //   },
  // ) {
  //   return this.aiService.getFeedback(
  //     body.question,
  //     body.selectedOption,
  //     body.correctAnswer,
  //     body.studentLevel ?? 'beginner',
  //   );
  // }

  // POST /api/v1/ai/generate-questions
  // Solo god y creator pueden generar preguntas
  // Body: { storyTitle, storyText, level, count? }
  @Post('generate-questions')
  @UseGuards(RolesGuard)
  @Roles('god', 'creator')
  async generateQuestions(
    @Body()
    body: {
      storyTitle: string;
      storyText: string;
      level: 'beginner' | 'intermediate' | 'advanced';
      count?: 5 | 10 | 15;
    },
  ) {
    return this.aiService.generateQuestionsFromStory(
      body.storyTitle,
      body.storyText,
      body.level,
      body.count ?? 5,
    );
  }

  // POST /api/v1/ai/explain
  // Body: { phrase, context, studentLevel? }
  @Post('explain')
  async explainGrammar(
    @Body()
    body: {
      phrase: string;
      context: string;
      studentLevel?: 'beginner' | 'intermediate' | 'advanced';
    },
  ) {
    return this.aiService.explainGrammar(
      body.phrase,
      body.context,
      body.studentLevel ?? 'beginner',
    );
  }
}
