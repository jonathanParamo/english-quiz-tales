import { Schema } from 'mongoose';

export const StorySchema = new Schema(
  {
    title: { type: String, required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    text: { type: String, required: true },
    audioUrl: { type: String, required: true },
    images: [{ type: String }],
  },
  { timestamps: true },
);
