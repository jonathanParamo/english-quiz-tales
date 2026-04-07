import { Schema, Document } from 'mongoose';

export interface PhrasePair extends Document {
  spanish: string;
  english: string;
  audioEs?: string;
  audioEn?: string;
  image?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  type?: 'simple' | 'continuous' | 'perfect' | 'perfect continuous';
  category?: string;
  createdAt: Date;
}

export const PhrasePairSchema = new Schema<PhrasePair>(
  {
    spanish: { type: String, required: true, trim: true },
    english: { type: String, required: true, trim: true },
    audioEs: { type: String, default: null },
    audioEn: { type: String, default: null },
    image: { type: String, default: null },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
      required: true,
    },
    category: { type: String, trim: true, default: null },
    type: {
      type: String,
      enum: ['simple', 'continuous', 'perfect', 'perfect continuous'],
      default: 'simple',
    },
  },
  { timestamps: true },
);

PhrasePairSchema.index({ level: 1 });
PhrasePairSchema.index({ level: 1, category: 1 });
