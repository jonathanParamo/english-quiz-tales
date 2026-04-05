import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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

  @Post('chat')
  async chat(
    @Req() req: Request,
    @Body()
    body: {
      messages: { role: 'user' | 'assistant'; content: string }[];
      progress?: {
        totalResults: number;
        avgScore: number;
        recentMistakes: string[];
        level: string;
      };
    },
  ) {
    return this.aiService.chat(body.messages, body.progress);
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
