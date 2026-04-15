import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { GroqWhisperService } from './groq-whisper.service';
import { ClozeService } from './cloze.service';
import { LyricsAlignerService } from './lyrics-aligner.service';
import { Video, VideoSchema } from './video.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
  ],
  controllers: [VideosController],
  providers: [
    VideosService,
    GroqWhisperService,
    ClozeService,
    LyricsAlignerService,
  ],
})
export class VideosModule {}
