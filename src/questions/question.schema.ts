import { Schema, Types } from 'mongoose';

export const QuestionSchema = new Schema({
  storyId: { type: Types.ObjectId, ref: 'Story', required: false },
  type: {
    type: String,
    enum: [
      'multiple',
      'true_false',
      'fill_blank',
      'listening',
      'matching',
      'choose_correct_sentence',
      'write_sentence',
    ],
    required: true,
  },
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: true,
  },
  audioUrl: { type: String },
  points: { type: Number, default: 1 },
  sceneTag: { type: String },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  explanation: { type: String },
});
