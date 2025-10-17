import { Schema } from 'mongoose';

export const ProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  storyId: { type: Schema.Types.ObjectId, ref: 'Story' },
  listeningScore: Number,
  writingScore: Number,
  totalPoints: Number,
});
