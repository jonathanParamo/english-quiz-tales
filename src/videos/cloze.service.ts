import { Injectable } from '@nestjs/common';
import { WhisperSegment } from './groq-whisper.service';
import { TranscriptSegment, BlankWord } from './video.schema';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type PlayerMode = 'write' | 'select';

const BLANK_RATE: Record<Difficulty, number> = {
  easy: 0.15,
  medium: 0.3,
  hard: 0.5,
};

const SKIP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'my',
  'your',
  'his',
  'its',
  'our',
  'their',
  'this',
  'that',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'for',
  'as',
  'up',
  'but',
  'and',
  'or',
  'so',
  'do',
  'did',
  'does',
  'has',
  'have',
  'had',
  'not',
  'no',
  'yes',
]);

function isLatinScript(text: string): boolean {
  const chars = text.replace(/\s/g, '');
  if (!chars.length) return true;
  const nonLatin = (chars.match(/[^\u0000-\u024F]/g) ?? []).length;
  return nonLatin / chars.length < 0.3;
}

function generateDistractors(
  correctWord: string,
  pool: string[],
  count = 3,
): string[] {
  const target = correctWord.toLowerCase();
  const targetLen = target.length;

  const candidates = pool
    .map((w) => w.replace(/[^a-zA-Z']/g, '').toLowerCase())
    .filter(
      (w) =>
        w.length >= 3 &&
        w !== target &&
        Math.abs(w.length - targetLen) <= 2 &&
        !SKIP_WORDS.has(w),
    );

  const unique = [...new Set(candidates)];

  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  const distractors = unique.slice(0, count);

  const fallbacks = [
    'something',
    'nothing',
    'everything',
    'anyone',
    'never',
    'always',
    'maybe',
    'really',
    'still',
    'just',
    'even',
    'only',
  ];
  let fi = 0;
  while (distractors.length < count && fi < fallbacks.length) {
    const fb = fallbacks[fi++];
    if (fb !== target && !distractors.includes(fb)) distractors.push(fb);
  }

  return distractors;
}

@Injectable()
export class ClozeService {
  /**
   * Genera segmentos con blanks a partir de segmentos que ya tienen
   * el texto correcto (letra oficial alineada).
   *
   * Los blanks generados aquí son los DEFINITIVOS — se guardan en DB
   * y no cambian. Solo `options` se regenera en runtime (modo select).
   */
  generateCloze(
    segments: WhisperSegment[],
    difficulty: Difficulty = 'medium',
    mode: PlayerMode = 'write',
  ): TranscriptSegment[] {
    const blankRate = BLANK_RATE[difficulty];

    const globalPool: string[] =
      mode === 'select'
        ? segments.flatMap((s) => s.text.split(/\s+/).filter(Boolean))
        : [];

    return segments.map((seg) => {
      if (!isLatinScript(seg.text)) {
        return {
          start: seg.start,
          end: seg.end,
          text: seg.text,
          blanks: [],
        } as TranscriptSegment;
      }

      const words = seg.text.split(/\s+/).filter(Boolean);

      const eligible = words
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => {
          const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
          return clean.length >= 3 && !SKIP_WORDS.has(clean);
        });

      const count = Math.max(
        eligible.length > 0 ? 1 : 0,
        Math.round(eligible.length * blankRate),
      );

      for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
      }

      const chosen = eligible.slice(0, count).sort((a, b) => a.i - b.i);

      const blanks: BlankWord[] = chosen.map(({ w, i }) => {
        const cleanWord = w.replace(/[^a-zA-Z']/g, '');
        const displayWords = [...words];
        displayWords[i] = '_'.repeat(Math.max(cleanWord.length, 4));

        const blank: BlankWord = {
          wordIndex: i,
          word: cleanWord,
          displayText: displayWords.join(' '),
        };

        if (mode === 'select') {
          const distractors = generateDistractors(cleanWord, globalPool);
          const options = [...distractors, cleanWord];
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
          }
          blank.options = options;
        }

        return blank;
      });

      return {
        start: seg.start,
        end: seg.end,
        text: seg.text,
        blanks,
      } as TranscriptSegment;
    });
  }

  /**
   * Regenera solo las `options` (distractores) para modo select,
   * sin cambiar wordIndex ni word. Usado en getTranscriptForPlayer.
   */
  addSelectOptions(segments: TranscriptSegment[]): TranscriptSegment[] {
    const globalPool = segments.flatMap((s) =>
      s.text.split(/\s+/).filter(Boolean),
    );

    return segments.map((seg) => ({
      ...seg,
      blanks: seg.blanks.map((blank) => {
        const distractors = generateDistractors(blank.word, globalPool);
        const options = [...distractors, blank.word];
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        return { ...blank, options };
      }),
    }));
  }
}
