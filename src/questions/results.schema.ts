import { Schema, model, Document, Types } from 'mongoose';

export interface Answer {
  question: Types.ObjectId;
  questionText: string;
  selected: string;
  correct: boolean;
  correctAnswer: string;
  feedback: string;
  explanation: string;
  points: number;
}

export interface GeneralFeedback {
  strengths: string;
  improvements: string;
  topicsToStudy: string[];
}

export interface Result extends Document {
  userId: Types.ObjectId;
  storyId: Types.ObjectId;
  answers: Answer[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  penaltyApplied: boolean;
  generalFeedback: GeneralFeedback;
  createdAt: Date;
}

const AnswerSchema = new Schema<Answer>({
  question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  questionText: { type: String, required: true },
  selected: { type: String, required: true },
  correct: { type: Boolean, required: true },
  correctAnswer: { type: String, required: true },
  feedback: { type: String, default: '' },
  explanation: { type: String, default: '' },
  points: { type: Number, default: 0 },
});

const GeneralFeedbackSchema = new Schema<GeneralFeedback>({
  strengths: { type: String, default: '' },
  improvements: { type: String, default: '' },
  topicsToStudy: [{ type: String }],
});

export const ResultSchema = new Schema<Result>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
  answers: [AnswerSchema],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  incorrectCount: { type: Number, required: true },
  penaltyApplied: { type: Boolean, default: false },
  generalFeedback: { type: GeneralFeedbackSchema, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export const ResultModel = model<Result>('Result', ResultSchema);
