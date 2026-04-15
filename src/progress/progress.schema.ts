import { Schema, Types } from 'mongoose';

export const PracticeSessionSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  documentId: { type: Types.ObjectId, ref: 'Document', required: true },

  mode: {
    type: String,
    enum: ['listen', 'vocabulary', 'writing', 'quiz'],
    required: true,
  },

  durationSeconds: { type: Number, default: 0 },

  quizScore: { type: Number, default: null },
  quizTotal: { type: Number, default: null },

  writingFeedback: {
    corrections: { type: Number, default: 0 },
    score: { type: Number, default: null }, // 0-100
    summary: { type: String, default: '' },
  },

  completedAt: { type: Date, default: Date.now },
});

export const ProgressSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  documentId: { type: Types.ObjectId, ref: 'Document', required: true },

  totalSessions: { type: Number, default: 0 },
  totalTimeSeconds: { type: Number, default: 0 },

  sessionsByMode: {
    listen: { type: Number, default: 0 },
    vocabulary: { type: Number, default: 0 },
    writing: { type: Number, default: 0 },
    quiz: { type: Number, default: 0 },
  },

  bestQuizScore: { type: Number, default: null },
  lastQuizScore: { type: Number, default: null },

  avgWritingScore: { type: Number, default: null },

  lastPracticedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

ProgressSchema.index({ userId: 1, documentId: 1 }, { unique: true });
