import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, Model } from 'mongoose';
import { AiService } from '../ai/ai.service';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel('Question') private readonly questionModel: Model<any>,
    @InjectModel('Result') private readonly resultModel: Model<any>,
    private readonly aiService: AiService,
  ) {}

  async create(questionData: any): Promise<any> {
    const newQuestion = new this.questionModel(questionData);
    return newQuestion.save();
  }

  async createMany(questions: any[]): Promise<any[]> {
    return this.questionModel.insertMany(questions);
  }

  async findAllByStory(storyId: string, filters?: any): Promise<any[]> {
    const query: any = { storyId };
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.sceneTag) query.sceneTag = filters.sceneTag;
    return this.questionModel.find(query).exec();
  }

  async findById(id: string): Promise<any> {
    return this.questionModel.findById(id).exec();
  }

  async getRandomByStory(storyId: string, limit: number): Promise<any[]> {
    const validId = Types.ObjectId.isValid(storyId)
      ? new Types.ObjectId(storyId)
      : storyId;

    return this.questionModel.aggregate([
      { $match: { storyId: validId } },
      { $sample: { size: limit } },
      { $project: { correctAnswer: 0 } },
    ]);
  }

  async gradeAndSave(
    userId: string,
    storyId: string,
    answers: { questionId: string; selected: string }[],
    penalty = false,
  ) {
    let score = 0;

    type AnswerDetail = {
      question: string;
      correct: boolean;
      correctAnswer: string;
      selected: string;
      feedback?: string;
      explanation?: string;
    };

    const details: AnswerDetail[] = [];

    const wrongsForAi: {
      index: number;
      question: string;
      selected: string;
      correctAnswer: string;
    }[] = [];

    for (const a of answers) {
      const question = await this.findById(a.questionId);
      if (!question) continue;

      const correct = question.correctAnswer === a.selected;

      if (correct) {
        score += question.points || 1;
        details.push({
          question: question.question,
          correct: true,
          correctAnswer: question.correctAnswer,
          selected: a.selected,
        });
      } else {
        wrongsForAi.push({
          index: details.length,
          question: question.question,
          selected: a.selected,
          correctAnswer: question.correctAnswer,
        });
        details.push({
          question: question.question,
          correct: false,
          correctAnswer: question.correctAnswer,
          selected: a.selected,
          feedback: '',
          explanation: '',
        });
      }
    }

    if (wrongsForAi.length > 0) {
      const batchFeedback = await this.aiService.getBatchFeedback(
        wrongsForAi,
        'beginner',
      );

      for (const fb of batchFeedback) {
        if (details[fb.index]) {
          details[fb.index].feedback = fb.feedback;
          details[fb.index].explanation = fb.explanation;
        }
      }
    }

    if (penalty) score = Math.max(0, score - 2);

    const generalFeedback = await this.aiService.getGeneralFeedback(details);

    // ── Paso 4: guardar en DB ────────────────────────────────────────
    const answersForDb = answers
      .map((a, index) => {
        const detail = details[index];
        if (!detail) return null;

        return {
          question: new Types.ObjectId(a.questionId),
          questionText: detail.question,
          selected: detail.selected,
          correct: detail.correct,
          correctAnswer: detail.correctAnswer,
          feedback: detail.feedback ?? '',
          explanation: detail.explanation ?? '',
          points: detail.correct ? 1 : 0,
        };
      })
      .filter(
        (
          a,
        ): a is {
          question: Types.ObjectId;
          questionText: string;
          selected: string;
          correct: boolean;
          correctAnswer: string;
          feedback: string;
          explanation: string;
          points: number;
        } => a !== null,
      );

    const correctCount = answersForDb.filter((a) => a.correct).length;
    const incorrectCount = answersForDb.length - correctCount;

    const result = await this.resultModel.create({
      userId: new Types.ObjectId(userId),
      storyId: new Types.ObjectId(storyId),
      score,
      totalQuestions: answersForDb.length,
      correctCount,
      incorrectCount,
      penaltyApplied: penalty,
      generalFeedback,
      answers: answersForDb,
    });

    return {
      result,
      score,
      total: answers.length,
      details,
      generalFeedback,
    };
  }

  async update(id: string, updateData: any): Promise<any> {
    return this.questionModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.questionModel.findByIdAndDelete(id);
    return { message: 'Question deleted successfully' };
  }
}
