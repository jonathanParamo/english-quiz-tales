import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoDocument = Video &
  Document & {
    _id: Types.ObjectId;
  };

export class BlankWord {
  wordIndex!: number;
  word!: string;
  displayText!: string;
  options?: string[];
}

export class TranscriptSegment {
  start!: number;
  end!: number;
  text!: string;
  blanks!: BlankWord[];
}

@Schema({ timestamps: true })
export class Video {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  videoUrl!: string;

  @Prop()
  fileId?: string;

  @Prop({ default: 'en' })
  language!: string;

  @Prop({ type: String, default: null })
  lyrics!: string | null;

  @Prop({ type: String, default: null })
  userSummary!: string | null;

  @Prop({ type: [Object], default: null })
  transcript!: TranscriptSegment[] | null;

  @Prop({ default: 'pending' })
  status!: 'pending' | 'processing' | 'ready' | 'error';

  @Prop()
  errorMessage?: string;

  @Prop({ unique: true, sparse: true })
  contentHash?: string;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
