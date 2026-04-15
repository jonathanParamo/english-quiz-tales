import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

export interface SaveSessionDto {
  documentId: string;
  mode: 'listen' | 'vocabulary' | 'writing' | 'quiz';
  durationSeconds: number;
  quizScore?: number;
  quizTotal?: number;
  writingFeedback?: {
    corrections: number;
    score: number;
    summary: string;
  };
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel('PracticeSession')
    private readonly sessionModel: Model<any>,
    @InjectModel('Progress')
    private readonly progressModel: Model<any>,
  ) {}

  async saveSession(userId: string, dto: SaveSessionDto): Promise<any> {
    const userObjId = new Types.ObjectId(userId);
    const docObjId = new Types.ObjectId(dto.documentId);

    await this.sessionModel.create({
      userId: userObjId,
      documentId: docObjId,
      mode: dto.mode,
      durationSeconds: dto.durationSeconds,
      quizScore: dto.quizScore ?? null,
      quizTotal: dto.quizTotal ?? null,
      writingFeedback: dto.writingFeedback ?? {},
    });

    const existing = await this.progressModel.findOne({
      userId: userObjId,
      documentId: docObjId,
    });

    if (!existing) {
      return this.progressModel.create({
        userId: userObjId,
        documentId: docObjId,
        totalSessions: 1,
        totalTimeSeconds: dto.durationSeconds,
        sessionsByMode: { [dto.mode]: 1 },
        bestQuizScore: dto.quizScore ?? null,
        lastQuizScore: dto.quizScore ?? null,
        avgWritingScore: dto.writingFeedback?.score ?? null,
        lastPracticedAt: new Date(),
      });
    }

    existing.totalSessions += 1;
    existing.totalTimeSeconds += dto.durationSeconds;
    existing.sessionsByMode[dto.mode] =
      (existing.sessionsByMode[dto.mode] ?? 0) + 1;
    existing.lastPracticedAt = new Date();

    if (dto.quizScore != null) {
      existing.lastQuizScore = dto.quizScore;
      if (
        existing.bestQuizScore == null ||
        dto.quizScore > existing.bestQuizScore
      ) {
        existing.bestQuizScore = dto.quizScore;
      }
    }

    if (dto.writingFeedback?.score != null) {
      const writingSessions = await this.sessionModel.find({
        userId: userObjId,
        documentId: docObjId,
        mode: 'writing',
        'writingFeedback.score': { $ne: null },
      });
      const scores = writingSessions.map((s: any) => s.writingFeedback.score);
      scores.push(dto.writingFeedback.score);
      existing.avgWritingScore =
        scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    }

    return existing.save();
  }

  async getProgressByDocument(
    userId: string,
    documentId: string,
  ): Promise<any> {
    return this.progressModel.findOne({
      userId: new Types.ObjectId(userId),
      documentId: new Types.ObjectId(documentId),
    });
  }

  async getAllProgress(userId: string): Promise<any[]> {
    return this.progressModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('documentId', 'title originalName contentType')
      .sort({ lastPracticedAt: -1 })
      .exec();
  }

  async getSessionHistory(
    userId: string,
    documentId: string,
    limit = 20,
  ): Promise<any[]> {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        documentId: new Types.ObjectId(documentId),
      })
      .sort({ completedAt: -1 })
      .limit(limit)
      .exec();
  }
}
