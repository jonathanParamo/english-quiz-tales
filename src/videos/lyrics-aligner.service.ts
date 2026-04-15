import { Injectable, Logger } from '@nestjs/common';
import { WhisperSegment } from './groq-whisper.service';

@Injectable()
export class LyricsAlignerService {
  private readonly logger = new Logger(LyricsAlignerService.name);

  align(whisperSegments: WhisperSegment[], lyrics: string): WhisperSegment[] {
    if (!lyrics || typeof lyrics !== 'string') {
      this.logger.warn('Lyrics inválidos, usando texto de Whisper sin alinear');
      return whisperSegments;
    }

    const lyricLines = this.parseLyrics(lyrics);

    if (lyricLines.length === 0) {
      this.logger.warn(
        'Lyrics vacíos tras parsear, usando texto de Whisper sin alinear',
      );
      return whisperSegments;
    }

    this.logger.log(
      `Alineando ${whisperSegments.length} segmentos Whisper con ${lyricLines.length} líneas de letra`,
    );

    const usedLines = new Set<number>();

    const aligned = whisperSegments.map((seg) => {
      // Guard: segmento sin texto
      if (!seg?.text || typeof seg.text !== 'string') {
        return seg;
      }

      const best = this.findBestMatch(seg.text, lyricLines, usedLines);

      if (best !== null) {
        usedLines.add(best.index);
        const matchedLine = lyricLines[best.index];
        // Guard: la línea matched existe
        if (matchedLine) {
          return { start: seg.start, end: seg.end, text: matchedLine };
        }
      }

      this.logger.warn(
        `Sin match para segmento "${seg.text.slice(0, 40)}", usando texto original`,
      );
      return seg;
    });

    return aligned;
  }

  private parseLyrics(lyrics: string): string[] {
    return lyrics
      .split('\n')
      .map((line) => (line ?? '').trim())
      .filter((line) => {
        if (!line) return false;
        if (/^\[.*\]$/.test(line)) return false;
        if (/^\(.*\)$/.test(line)) return false;
        return true;
      });
  }

  private tokenize(text: string): Set<string> {
    // Guard: asegurar que text es string
    if (!text || typeof text !== 'string') return new Set();

    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-záéíóúüñ'\s]/gi, '')
        .split(/\s+/)
        .filter(Boolean),
    );
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    a.forEach((token) => {
      if (b.has(token)) intersection++;
    });
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private findBestMatch(
    whisperText: string,
    lyricLines: string[],
    usedLines: Set<number>,
  ): { index: number; score: number } | null {
    if (!whisperText || lyricLines.length === 0) return null;

    const whisperTokens = this.tokenize(whisperText);
    let bestScore = -1;
    let bestIndex = -1;

    lyricLines.forEach((line, i) => {
      if (usedLines.has(i)) return;
      if (!line || typeof line !== 'string') return;
      const score = this.jaccard(whisperTokens, this.tokenize(line));
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    if (bestScore <= 0 || bestIndex === -1) {
      // Fallback: siguiente línea libre en orden
      const nextFree = lyricLines.findIndex((_, i) => !usedLines.has(i));
      if (nextFree !== -1) return { index: nextFree, score: 0 };
      return null;
    }

    return { index: bestIndex, score: bestScore };
  }
}
