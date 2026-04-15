import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './video.schema';
import { GroqWhisperService } from './groq-whisper.service';
import { ClozeService, Difficulty, PlayerMode } from './cloze.service';
import { LyricsAlignerService } from './lyrics-aligner.service';
import { uploadVideoToCloudinary } from '../common/cloudinary.utils';
import * as crypto from 'crypto';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly groqWhisper: GroqWhisperService,
    private readonly clozeService: ClozeService,
    private readonly lyricsAligner: LyricsAlignerService,
  ) {}

  async uploadAndProcess(
    file: Express.Multer.File,
    title: string,
    lyrics?: string,
  ): Promise<VideoDocument> {
    const contentHash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    const existing = await this.videoModel.findOne({ contentHash });

    if (existing) {
      this.logger.log(
        `Video duplicado detectado (hash: ${contentHash.slice(0, 8)}...)`,
      );

      if (existing.status === 'ready' && existing.transcript) {
        return this.videoModel.create({
          title,
          videoUrl: existing.videoUrl,
          fileId: existing.fileId,
          language: existing.language,
          transcript: existing.transcript,
          lyrics: lyrics ?? existing.lyrics,
          status: 'ready',
        });
      }
    }

    const { url, public_id } = await uploadVideoToCloudinary(file);

    const video = await this.videoModel.create({
      title,
      videoUrl: url,
      fileId: public_id,
      status: 'pending',
      transcript: null,
      lyrics: lyrics ?? null,
      contentHash,
    });

    this.processInBackground(
      video._id.toString(),
      file.buffer,
      file.originalname,
      lyrics,
    );

    return video;
  }

  private async processInBackground(
    videoId: string,
    buffer: Buffer,
    originalName: string,
    lyrics?: string,
  ): Promise<void> {
    try {
      await this.videoModel.findByIdAndUpdate(videoId, {
        status: 'processing',
      });

      const whisperResult = await this.groqWhisper.transcribe(
        buffer,
        originalName,
      );

      // ✅ Si hay letra oficial, alinear timestamps de Whisper con texto correcto
      const alignedSegments = lyrics
        ? this.lyricsAligner.align(whisperResult.segments, lyrics)
        : whisperResult.segments;

      // Generar blanks FIJOS con difficulty=medium como base.
      // Se guardan en DB y no cambian — son la fuente de verdad.
      const transcript = this.clozeService.generateCloze(
        alignedSegments,
        'medium',
        'write', // write para que no genere options en DB (se añaden en runtime)
      );

      await this.videoModel.findByIdAndUpdate(videoId, {
        transcript,
        language: whisperResult.language,
        status: 'ready',
      });

      this.logger.log(`Video ${videoId} listo`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error procesando video: ${error.message}`);
      } else {
        this.logger.error('Error desconocido procesando video');
      }

      await this.videoModel.findByIdAndUpdate(videoId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async findById(id: string): Promise<VideoDocument> {
    const video = await this.videoModel.findById(id).exec();
    if (!video) throw new NotFoundException(`Video ${id} no encontrado`);
    return video;
  }

  async findAll(): Promise<VideoDocument[]> {
    return this.videoModel
      .find()
      .select('-transcript -lyrics')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Devuelve el transcript para el player.
   *
   * Los blanks (wordIndex, word, displayText) vienen fijos de DB.
   * Solo se regeneran las `options` para modo select (distractores aleatorios).
   * El texto de cada segmento es siempre la letra oficial.
   */
  async getTranscriptForPlayer(
    id: string,
    difficulty: Difficulty = 'medium',
    mode: PlayerMode = 'write',
  ) {
    const video = await this.findById(id);

    if (video.status !== 'ready' || !video.transcript) {
      return { status: video.status, transcript: null };
    }

    // Filtrar blanks según difficulty
    // easy → ~15% de blanks, medium → ~30%, hard → todos los blanks guardados
    const filteredSegments = this.filterByDifficulty(
      video.transcript,
      difficulty,
    );

    // Añadir options solo en modo select
    const withOptions =
      mode === 'select'
        ? this.clozeService.addSelectOptions(filteredSegments)
        : filteredSegments;

    // Safe transcript — NUNCA incluir `word` al cliente
    const safeTranscript = withOptions.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
      blanks: seg.blanks.map((b) => ({
        wordIndex: b.wordIndex,
        displayText: b.displayText,
        ...(mode === 'select' && b.options ? { options: b.options } : {}),
      })),
    }));

    return { status: 'ready', transcript: safeTranscript };
  }

  /**
   * Filtra los blanks de cada segmento según la dificultad pedida.
   * Los blanks están ordenados por wordIndex — tomamos un subconjunto.
   *
   * hard   → todos los blanks guardados en DB
   * medium → 60% de los blanks (redondeado arriba, mínimo 1 si hay alguno)
   * easy   → 30% de los blanks (redondeado arriba, mínimo 1 si hay alguno)
   */
  private filterByDifficulty(
    segments: NonNullable<VideoDocument['transcript']>,
    difficulty: Difficulty,
  ) {
    const ratios: Record<Difficulty, number> = {
      easy: 0.3,
      medium: 0.6,
      hard: 1.0,
    };
    const ratio = ratios[difficulty];

    return segments.map((seg) => {
      if (seg.blanks.length === 0) return seg;
      const keep = Math.max(1, Math.ceil(seg.blanks.length * ratio));
      return { ...seg, blanks: seg.blanks.slice(0, keep) };
    });
  }

  async checkAnswer(
    videoId: string,
    segmentIndex: number,
    blankIndex: number,
    userAnswer: string,
  ): Promise<{ correct: boolean; correctWord?: string }> {
    const video = await this.findById(videoId);

    if (video.status !== 'ready' || !video.transcript) {
      return { correct: false };
    }

    const segment = video.transcript[segmentIndex];
    if (!segment) return { correct: false };

    const blank = segment.blanks[blankIndex];
    if (!blank) return { correct: false };

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z']/g, '')
        .trim();

    const correct = normalize(userAnswer) === normalize(blank.word);

    return { correct, correctWord: blank.word };
  }
}
