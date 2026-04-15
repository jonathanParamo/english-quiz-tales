import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Difficulty, PlayerMode } from './cloze.service';

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const VALID_MODES: PlayerMode[] = ['write', 'select'];

@Controller('videos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @Roles('god')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'video/x-msvideo',
          'audio/mpeg',
          'audio/mp4',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Solo mp4, webm, mov, avi, mp3, m4a'),
            false,
          );
        }
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    // ✅ Letra oficial opcional — si se omite, se usa el texto de Whisper
    @Body('lyrics') lyrics?: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    if (!title) throw new BadRequestException('El campo title es requerido');

    const cleanLyrics = lyrics?.trim() || undefined;

    const video = await this.videosService.uploadAndProcess(
      file,
      title,
      cleanLyrics,
    );

    return {
      id: video._id,
      title: video.title,
      status: video.status,
      hasLyrics: !!cleanLyrics,
      message:
        video.status === 'ready'
          ? 'Video ya estaba procesado, transcript reutilizado.'
          : cleanLyrics
            ? 'Video subido con letra oficial. Procesando alineación...'
            : 'Video subido. Groq transcribiendo (sin letra oficial).',
    };
  }

  @Get()
  async getAllVideos() {
    return this.videosService.findAll();
  }

  @Get(':id')
  async getVideo(@Param('id') id: string) {
    const video = await this.videosService.findById(id);
    return {
      id: video._id,
      title: video.title,
      videoUrl: video.videoUrl,
      status: video.status,
      language: video.language,
    };
  }

  @Get(':id/transcript')
  async getTranscript(
    @Param('id') id: string,
    @Query('difficulty') difficulty?: string,
    @Query('mode') mode?: string,
  ) {
    const validDifficulty: Difficulty = VALID_DIFFICULTIES.includes(
      difficulty as Difficulty,
    )
      ? (difficulty as Difficulty)
      : 'medium';

    const validMode: PlayerMode = VALID_MODES.includes(mode as PlayerMode)
      ? (mode as PlayerMode)
      : 'write';

    return this.videosService.getTranscriptForPlayer(
      id,
      validDifficulty,
      validMode,
    );
  }

  @Post(':id/check')
  async checkAnswer(
    @Param('id') id: string,
    @Body() body: { segmentIndex: number; blankIndex: number; answer: string },
  ) {
    if (body.answer === undefined || body.answer === null)
      throw new BadRequestException('El campo answer es requerido');

    return this.videosService.checkAnswer(
      id,
      body.segmentIndex,
      body.blankIndex,
      body.answer,
    );
  }
}
