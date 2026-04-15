import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoDocument = Video &
  Document & {
    _id: Types.ObjectId;
  };

export class BlankWord {
  wordIndex!: number;
  word!: string; // la palabra correcta (nunca se envía al cliente)
  displayText!: string; // texto del segmento con la palabra reemplazada por ____
  options?: string[]; // solo en mode=select
}

export class TranscriptSegment {
  start!: number;
  end!: number;
  text!: string; // letra oficial (no Whisper)
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

  // ✅ Letra oficial pegada por el admin — fuente de verdad para el texto
  // ✅ Tipo explícito
  @Prop({ type: String, default: null })
  lyrics!: string | null;

  // transcript guarda solo start/end/text (letra oficial) + blanks base (medium/write)
  // Los blanks se regeneran en runtime; el texto NO cambia nunca
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
