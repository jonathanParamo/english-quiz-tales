import { Schema, Types } from 'mongoose';

export const AnswerSchema = new Schema({
  questionId: { type: Types.ObjectId, ref: 'Question', required: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  storyId: { type: Types.ObjectId, ref: 'Story' },
  selectedOption: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, default: 0 },
  answeredAt: { type: Date, default: Date.now },
  timeTakenMs: { type: Number },
  feedback: { type: String },
});
