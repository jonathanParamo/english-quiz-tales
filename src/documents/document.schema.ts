import { Schema, Types } from 'mongoose';

export type DocumentContentType = 'verbs' | 'vocabulary' | 'story' | 'mixed';

const VerbEntrySchema = new Schema(
  {
    infinitive: { type: String, required: true },
    pastSimple: { type: String, default: '' },
    pastParticiple: { type: String, default: '' },
    spanish: { type: String, default: '' },
    example: { type: String, default: '' },
  },
  { _id: false },
);

const VocabEntrySchema = new Schema(
  {
    word: { type: String, required: true },
    type: { type: String, default: 'noun' },
    definition: { type: String, default: '' },
    spanish: { type: String, default: '' },
    example: { type: String, default: '' },
  },
  { _id: false },
);

export const DocumentSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },

  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },

  rawText: { type: String, required: true },

  contentType: {
    type: String,
    enum: ['verbs', 'vocabulary', 'story', 'mixed'],
    required: true,
  },

  title: { type: String, default: '' },

  verbs: { type: [VerbEntrySchema], default: [] },
  vocabulary: { type: [VocabEntrySchema], default: [] },

  paragraphs: [{ type: String }],

  summary: { type: String, default: '' },

  generatedQuestions: [{ type: Types.ObjectId, ref: 'Question' }],

  createdAt: { type: Date, default: Date.now },
});
