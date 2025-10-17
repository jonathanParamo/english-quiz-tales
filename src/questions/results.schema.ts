import { Schema, model, Document, Types } from 'mongoose';

export interface Result extends Document {
  userId: Types.ObjectId;
  storyId: Types.ObjectId;
  answers: {
    question: Types.ObjectId;
    selected: string;
  }[];
  score: number;
  penaltyApplied: boolean;
  createdAt: Date;
}

export const ResultSchema = new Schema<Result>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
  answers: [
    {
      question: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
      selected: { type: String, required: true },
    },
  ],
  score: { type: Number, required: true },
  penaltyApplied: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const ResultModel = model<Result>('Result', ResultSchema);
