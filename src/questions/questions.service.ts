import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Model } from 'mongoose';
import { ResultModel } from './results.schema';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel('Question') private readonly questionModel: Model<any>,
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

  async gradeAnswers(answers: { questionId: string; selected: string }[]) {
    let score = 0;

    const details: {
      question: string;
      correct: boolean;
      correctAnswer: string;
      selected: string;
    }[] = [];

    for (const ans of answers) {
      const question = await this.questionModel.findById(ans.questionId);
      if (!question) continue;

      const correct = question.correctAnswer === ans.selected;
      if (correct) score++;

      details.push({
        question: question.question,
        correct,
        correctAnswer: question.correctAnswer,
        selected: ans.selected,
      });
    }

    return { score, total: answers.length, details };
  }

  async getRandomByStory(storyId: string, limit: number): Promise<any[]> {
    const validId = Types.ObjectId.isValid(storyId)
      ? new Types.ObjectId(storyId)
      : storyId;

    return this.questionModel.aggregate([
      { $match: { storyId: validId } },
      { $sample: { size: limit } },
      { $project: { correctAnswers: 0 } },
    ]);
  }

  async gradeAndSave(
    userId: string,
    storyId: string,
    answers: any[],
    penalty = false,
  ) {
    let score = 0;

    for (const a of answers) {
      const question = await this.findById(a.questionId);
      if (question.correctAnswer === a.selected) {
        score += question.points || 1;
      }
    }

    if (penalty) score = Math.max(0, score - 2);

    const result = await ResultModel.create({
      userId,
      storyId,
      answers,
      score,
      penalty,
    });
    return { score, resultId: result._id };
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
