import { Schema } from 'mongoose';

export const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'creator', 'admin', 'god'],
      default: 'student',
    },
  },
  {
    timestamps: true,
  },
);
