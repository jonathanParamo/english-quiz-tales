import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface WhisperResult {
  segments: WhisperSegment[];
  language: string;
}

@Injectable()
export class GroqWhisperService {
  private readonly logger = new Logger(GroqWhisperService.name);
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Cola simple: máximo 1 transcripción a la vez para no saturar
  private isProcessing = false;
  private queue: Array<() => void> = [];

  async transcribe(
    buffer: Buffer,
    originalName: string,
  ): Promise<WhisperResult> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        let tempFile: string | null = null;
        try {
          tempFile = await this.saveTempFile(buffer, originalName);
          const result = await this.callGroq(tempFile, originalName);
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          if (tempFile && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          this.isProcessing = false;
          this.runNext();
        }
      };

      if (!this.isProcessing) {
        this.isProcessing = true;
        task();
      } else {
        this.logger.log('Tarea en cola, esperando turno...');
        this.queue.push(() => {
          this.isProcessing = true;
          task();
        });
      }
    });
  }

  private runNext() {
    const next = this.queue.shift();
    if (next) next();
  }

  private async saveTempFile(
    buffer: Buffer,
    originalName: string,
  ): Promise<string> {
    const ext = path.extname(originalName) || '.mp4';
    const tempPath = path.join(os.tmpdir(), `groq_${Date.now()}${ext}`);
    fs.writeFileSync(tempPath, buffer);
    this.logger.log(`Archivo temporal guardado: ${tempPath}`);
    return tempPath;
  }

  private async callGroq(
    filePath: string,
    originalName: string,
  ): Promise<WhisperResult> {
    this.logger.log(`Enviando a Groq Whisper: ${originalName}`);

    // Groq acepta archivos de hasta 25MB
    // Si tu video es más grande, necesitarías extraer solo el audio primero
    const fileStream = fs.createReadStream(filePath);

    const transcription = await this.groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3-turbo', // el más rápido y preciso disponible en Groq
      response_format: 'verbose_json', // necesario para obtener timestamps
      timestamp_granularities: ['segment'],
    });

    // verbose_json devuelve segments con start/end
    const raw = transcription as any;

    const segments: WhisperSegment[] = (raw.segments ?? []).map((seg: any) => ({
      start: Math.round(seg.start * 100) / 100,
      end: Math.round(seg.end * 100) / 100,
      text: seg.text.trim(),
    }));

    // Si Groq no devuelve segments (video muy corto), crear uno solo
    if (segments.length === 0 && raw.text) {
      segments.push({ start: 0, end: 5, text: raw.text.trim() });
    }

    this.logger.log(
      `Groq completado: ${segments.length} segmentos, idioma: ${raw.language}`,
    );

    return {
      segments,
      language: raw.language ?? 'en',
    };
  }
}
