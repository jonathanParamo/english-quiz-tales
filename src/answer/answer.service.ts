import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AnswerService {
  constructor(
    @InjectModel('Answer') private readonly answerModel: Model<any>,
    @InjectModel('Question') private readonly questionModel: Model<any>,
  ) {}

  async submitAnswer(answerData: {
    questionId: string;
    userId: string;
    selectedOption: string;
  }): Promise<any> {
    const question = await this.questionModel.findById(answerData.questionId);
    if (!question) throw new Error('Question not found');

    const isCorrect = question.correctAnswer === answerData.selectedOption;
    const pointsEarned = isCorrect ? question.points || 1 : 0;

    const newAnswer = new this.answerModel({
      questionId: answerData.questionId,
      userId: answerData.userId,
      storyId: question.storyId,
      selectedOption: answerData.selectedOption,
      isCorrect,
      pointsEarned,
    });

    return newAnswer.save();
  }

  async findAllByUser(userId: string): Promise<any[]> {
    return this.answerModel.find({ userId }).populate('questionId').exec();
  }

  async findByStory(userId: string, storyId: string): Promise<any[]> {
    return this.answerModel
      .find({ userId, storyId })
      .populate('questionId')
      .exec();
  }

  async getScoreByStory(userId: string, storyId: string): Promise<any> {
    const answers = await this.answerModel.find({ userId, storyId }).exec();

    const score = answers.reduce(
      (sum, ans) => sum + (ans.pointsEarned || 0),
      0,
    );
    const total = answers.length;

    return { score, total };
  }

  async gradeAnswer(
    questionId: string,
    userId: string,
    selectedOption: string,
  ): Promise<any> {
    const question = await this.questionModel.findById(questionId);
    if (!question) throw new Error('Question not found');

    const isCorrect = question.correctAnswer === selectedOption;
    const pointsEarned = isCorrect ? question.points || 1 : 0;

    const newAnswer = new this.answerModel({
      questionId,
      userId,
      storyId: question.storyId,
      selectedOption,
      isCorrect,
      pointsEarned,
    });

    return newAnswer.save();
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.answerModel.findByIdAndDelete(id);
    return { message: 'Answer deleted successfully' };
  }
}
