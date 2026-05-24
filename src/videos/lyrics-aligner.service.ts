import { Injectable, Logger } from '@nestjs/common';
import { WhisperSegment } from './groq-whisper.service';

@Injectable()
export class LyricsAlignerService {
  private readonly logger = new Logger(LyricsAlignerService.name);

  align(whisperSegments: WhisperSegment[], lyrics: string): WhisperSegment[] {
    if (!lyrics || typeof lyrics !== 'string') {
      this.logger.warn('Lyrics inválidos — usando texto Whisper sin alinear');
      return whisperSegments;
    }

    const lyricLines = this.parseLyrics(lyrics);

    if (lyricLines.length === 0) {
      this.logger.warn('Lyrics vacíos — usando texto Whisper sin alinear');
      return whisperSegments;
    }

    if (whisperSegments.length === 0) return whisperSegments;

    this.logger.log(
      `Alineando ${whisperSegments.length} segs Whisper ↔ ${lyricLines.length} líneas de letra`,
    );

    const expandedSegments = this.expandMultiLineSegments(
      whisperSegments,
      lyricLines,
    );

    this.logger.log(`Tras expansión: ${expandedSegments.length} segmentos`);

    return this.alignDTW(expandedSegments, lyricLines);
  }

  private expandMultiLineSegments(
    segments: WhisperSegment[],
    lyricLines: string[],
  ): WhisperSegment[] {
    const result: WhisperSegment[] = [];
    let lyricPtr = 0;

    for (const seg of segments) {
      if (lyricPtr >= lyricLines.length) {
        result.push(seg);
        continue;
      }

      const segTokens = this.tokenize(seg.text);

      const matchedLines: string[] = [];
      let tempPtr = lyricPtr;

      while (tempPtr < lyricLines.length && tempPtr < lyricPtr + 6) {
        const lineTokens = this.tokenize(lyricLines[tempPtr]);
        const lineContribution = this.tokenOverlap(segTokens, lineTokens);

        if (
          lineContribution > 0.3 ||
          (matchedLines.length === 0 &&
            this.jaccard(segTokens, lineTokens) > 0.2)
        ) {
          matchedLines.push(lyricLines[tempPtr]);
          tempPtr++;
        } else {
          break;
        }
      }

      if (matchedLines.length <= 1) {
        result.push(seg);
        if (matchedLines.length === 1) lyricPtr++;
      } else {
        const duration = seg.end - seg.start;
        const totalWords = matchedLines.reduce(
          (acc, l) => acc + l.split(/\s+/).filter(Boolean).length,
          0,
        );
        let currentStart = seg.start;

        for (let i = 0; i < matchedLines.length; i++) {
          const lineWords = matchedLines[i].split(/\s+/).filter(Boolean).length;
          const fraction = lineWords / totalWords;
          const subEnd =
            i === matchedLines.length - 1
              ? seg.end
              : Math.round((currentStart + duration * fraction) * 100) / 100;

          result.push({
            start: Math.round(currentStart * 100) / 100,
            end: subEnd,
            text: matchedLines[i],
          });

          currentStart = subEnd;
        }

        lyricPtr = tempPtr;
      }
    }

    return result;
  }

  private alignDTW(
    segments: WhisperSegment[],
    lines: string[],
  ): WhisperSegment[] {
    const n = segments.length;
    const m = lines.length;
    const assigned: string[] = new Array(n).fill('');
    let linePtr = 0;

    for (let i = 0; i < n; i++) {
      const segTokens = this.tokenize(segments[i].text);
      const window = Math.max(3, Math.ceil(m / n) + 2);
      const end = Math.min(linePtr + window, m);

      let bestScore = -1;
      let bestJ = linePtr;

      for (let j = linePtr; j < end; j++) {
        const score = this.jaccard(segTokens, this.tokenize(lines[j]));
        if (score > bestScore) {
          bestScore = score;
          bestJ = j;
        }
      }

      assigned[i] = lines[bestJ] ?? segments[i].text;

      const remaining = n - i - 1;
      linePtr = Math.min(bestJ + 1, m - remaining);
      if (linePtr < 0) linePtr = 0;
    }

    return segments.map((seg, i) => ({
      start: seg.start,
      end: seg.end,
      text: assigned[i] || seg.text,
    }));
  }

  private parseLyrics(lyrics: string): string[] {
    return lyrics
      .split('\n')
      .map((line) => (line ?? '').trim())
      .filter((line) => {
        if (!line || line.length < 2) return false;
        if (/^\[.*\]$/.test(line)) return false;
        if (/^\(.*\)$/.test(line)) return false;
        return true;
      });
  }

  private tokenize(text: string): Set<string> {
    if (!text || typeof text !== 'string') return new Set();
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-záéíóúüñ'\s]/gi, '')
        .split(/\s+/)
        .filter((w) => w.length > 0),
    );
  }

  private tokenizeCombined(lines: string[], extra?: string): Set<string> {
    const all = extra ? [...lines, extra] : lines;
    return this.tokenize(all.join(' '));
  }

  private tokenOverlap(
    segTokens: Set<string>,
    lineTokens: Set<string>,
  ): number {
    if (lineTokens.size === 0) return 0;
    let overlap = 0;
    lineTokens.forEach((t) => {
      if (segTokens.has(t)) overlap++;
    });
    return overlap / lineTokens.size;
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
}
