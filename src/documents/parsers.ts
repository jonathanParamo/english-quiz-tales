import { Injectable } from '@nestjs/common';

type Verb = {
  infinitive: string;
  pastSimple: string;
  pastParticiple: string;
  spanish: string;
  example: string;
};

type Vocabulary = {
  word: string;
  definition: string;
  type: string;
  spanish: string;
  example: string;
};

@Injectable()
export class TextParserService {
  parse(rawText: string) {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const verbs: Verb[] = [];
    const vocabulary: Vocabulary[] = [];
    const paragraphs: string[] = [];

    for (const line of lines) {
      const verbMatch = line.match(/^(\w+)\s+(\w+)\s+(\w+)/);

      if (verbMatch) {
        verbs.push({
          infinitive: verbMatch[1],
          pastSimple: verbMatch[2],
          pastParticiple: verbMatch[3],
          spanish: '',
          example: '',
        });
        continue;
      }

      // 🧠 detectar vocabulario tipo: word - definition
      if (line.includes('-')) {
        const [word, ...rest] = line.split('-');
        const def = rest.join('-');
        vocabulary.push({
          word: word.trim(),
          definition: def.trim(),
          type: '',
          spanish: '',
          example: '',
        });
        continue;
      }

      // 🧠 todo lo demás = párrafo
      paragraphs.push(line);
    }

    return {
      contentType: this.detectType(verbs, vocabulary, paragraphs),
      verbs,
      vocabulary,
      paragraphs,
      title: 'Parsed Document',
      summary: '',
    };
  }

  private detectType(verbs, vocab, paragraphs) {
    if (verbs.length > vocab.length && verbs.length > paragraphs.length)
      return 'verbs';
    if (vocab.length > verbs.length && vocab.length > paragraphs.length)
      return 'vocabulary';
    if (paragraphs.length > 0) return 'story';
    return 'mixed';
  }
}
