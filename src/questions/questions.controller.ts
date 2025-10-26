import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  Req,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './create-question.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { uploadAudioToCloudinary } from '../common/cloudinary.utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GradeResultDto } from './grade-result.dto';
import { ImageKitService } from 'src/common/imagekit.service';

function isValidAnswer(type: string, selected: any): boolean {
  if (
    type === 'multiple' ||
    type === 'true_false' ||
    type === 'choose_correct_sentence'
  ) {
    return typeof selected === 'string' && selected.trim() !== '';
  }

  if (type === 'fill_blank' || type === 'write_sentence') {
    return typeof selected === 'string' && selected.trim().length > 2;
  }

  if (type === 'matching') {
    return (
      Array.isArray(selected) &&
      selected.length > 0 &&
      selected.every((v) => typeof v === 'string' && v.trim() !== '')
    );
  }

  return false;
}

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly imageKitService: ImageKitService,
    @InjectModel('Result') private readonly resultModel: Model<any>,
  ) {}

  @Post('story/:storyId')
  @Roles('god')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'audio', maxCount: 1 }]))
  async createQuestion(
    @Param('storyId') storyId: string,
    @UploadedFiles() files: { audio?: Express.Multer.File[] },
    @Body() body: CreateQuestionDto,
  ) {
    try {
      if (typeof body.options === 'string') {
        body.options = JSON.parse(body.options);
      }
      if (typeof body.points === 'string') {
        body.points = parseInt(body.points, 10);
      }

      const audioFile = files.audio?.[0];
      let audioUrl: string | null = null;

      if (audioFile) {
        audioUrl = await uploadAudioToCloudinary(audioFile);
      } else {
      }

      const questionData = {
        ...body,
        storyId,
        audioUrl,
      };

      const savedQuestion = await this.questionsService.create(questionData);
      return savedQuestion;
    } catch (error) {
      throw error;
    }
  }

  @Post('story/:storyId/bulk')
  @Roles('god')
  @UseGuards(RolesGuard)
  async createMultipleQuestions(
    @Param('storyId') storyId: string,
    @Body() questions: any[],
  ) {
    const questionsWithStoryId = questions.map((q) => ({ ...q, storyId }));
    return this.questionsService.createMany(questionsWithStoryId);
  }

  @Get(':storyId')
  async getQuestionsByStory(
    @Param('storyId') storyId: string,
    @Query('difficulty') difficulty?: string,
    @Query('sceneTag') sceneTag?: string,
  ) {
    return this.questionsService.findAllByStory(storyId, {
      difficulty,
      sceneTag,
    });
  }

  @Get('single/:id')
  async getQuestionById(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }

  @Post('grade')
  @UseGuards(JwtAuthGuard)
  async grade(@Req() req, @Body() body: GradeResultDto) {
    try {
      const questions = await this.questionsService.findAllByStory(
        body.storyId,
      );

      let totalScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      const details: {
        question: string;
        correctAnswer: string;
        selected: string;
        correct: boolean;
      }[] = [];
      console.log(questions);

      const mappedAnswers = body.answers
        .map((userAnswer) => {
          const question = questions.find(
            (q) =>
              q._id.toString() === userAnswer.questionId ||
              q.question.toString() === userAnswer.questionId,
          );

          if (!question) return null;

          const selected = userAnswer.selected;
          if (!isValidAnswer(question.type, selected)) return null;

          const correct = question.correctAnswer === selected;

          if (correct) {
            correctCount++;
            totalScore += question.points ?? 1;
          } else {
            incorrectCount++;
          }

          details.push({
            question: question.question,
            correctAnswer: Array.isArray(question.correctAnswer)
              ? question.correctAnswer.join(', ')
              : question.correctAnswer,
            selected: Array.isArray(selected)
              ? selected.join(', ')
              : selected || '',
            correct,
          });

          return {
            question: question._id,
            selected,
            type: question.type,
          };
        })
        .filter(Boolean);

      if (body.penalty) {
        totalScore = Math.max(0, totalScore - 2);
      }

      const result = await this.resultModel.create({
        userId: req.user.id,
        storyId: body.storyId,
        answers: mappedAnswers,
        score: totalScore,
        correct: correctCount,
        incorrect: incorrectCount,
        penaltyApplied: body.penalty ?? false,
        details,
      });

      return {
        resultId: result._id,
        totalScore,
        correct: correctCount,
        incorrect: incorrectCount,
        maxScore: questions.reduce((sum, q) => sum + (q.points ?? 1), 0),
        details,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @Get(':storyId/random/:limit')
  async getRandomQuestions(
    @Param('storyId') storyId: string,
    @Param('limit') limit: number,
  ) {
    return this.questionsService.getRandomByStory(storyId, Number(limit));
  }

  @Patch('single/:id')
  @Roles('god')
  async updateQuestion(@Param('id') id: string, @Body() body: any) {
    return this.questionsService.update(id, body);
  }

  @Delete('single/:id')
  @Roles('god')
  @UseGuards(RolesGuard)
  async deleteQuestion(@Param('id') id: string) {
    return this.questionsService.delete(id);
  }

  @Post('level')
  @Roles('god')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'audio', maxCount: 1 }]))
  async createLevelQuestion(
    @UploadedFiles() files: { audio?: Express.Multer.File[] },
    @Body() body: CreateQuestionDto,
  ) {
    try {
      if (!body.question || !body.type || !body.difficulty) {
        throw new BadRequestException('Campos obligatorios faltantes');
      }

      if (typeof body.options === 'string') {
        try {
          body.options = JSON.parse(body.options);
        } catch {
          throw new BadRequestException('Formato inválido en options');
        }
      }

      if (typeof body.points === 'string') {
        body.points = parseInt(body.points, 10);
      }

      const audioFile = files.audio?.[0];
      let audioUrl: string | null = null;

      if (audioFile) {
        audioUrl = await this.imageKitService.uploadAudio(audioFile);
      }

      const questionData = {
        ...body,
        audioUrl,
        storyId: null,
      };

      const savedQuestion = await this.questionsService.create(questionData);
      return savedQuestion;
    } catch (error) {
      console.error('Error al crear pregunta por nivel:', error);
      throw new InternalServerErrorException('No se pudo crear la pregunta');
    }
  }
}
