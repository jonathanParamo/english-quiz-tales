import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

  private async callGemini(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const url = `${this.apiUrl}?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            systemInstruction: {
              role: 'system',
              parts: [{ text: systemPrompt }],
            },
          }),
        });

        if (res.status === 429) {
          console.warn('⚠️ Gemini rate limit (429) — trying Groq...');
        } else if (!res.ok) {
          const err = await res.text();
          console.warn(
            `⚠️ Gemini error ${res.status}:`,
            err,
            '— trying Groq...',
          );
        } else {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
          console.warn('⚠️ Gemini returned empty — trying Groq...');
        }
      } catch (err) {
        console.warn('⚠️ Gemini threw exception:', err, '— trying Groq...');
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set — trying Groq...');
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const res = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              max_tokens: 400,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
            }),
          },
        );

        if (res.status === 429) {
          console.warn('⚠️ Groq rate limit (429) — trying OpenRouter...');
        } else if (!res.ok) {
          const err = await res.text();
          console.warn(
            `⚠️ Groq error ${res.status}:`,
            err,
            '— trying OpenRouter...',
          );
        } else {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
          console.warn('⚠️ Groq returned empty — trying OpenRouter...');
        }
      } catch (err) {
        console.warn('⚠️ Groq threw exception:', err, '— trying OpenRouter...');
      }
    } else {
      console.warn('⚠️ GROQ_API_KEY not set — trying OpenRouter...');
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const res = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${openRouterKey}`,
              'HTTP-Referer': 'http://localhost:3000',
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.1-8b-instruct:free',
              max_tokens: 400,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
            }),
          },
        );

        if (res.status === 429) {
          console.warn(
            '⚠️ OpenRouter rate limit (429) — all providers exhausted.',
          );
        } else if (!res.ok) {
          const err = await res.text();
          console.warn(`⚠️ OpenRouter error ${res.status}:`, err);
        } else {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
          console.warn('⚠️ OpenRouter returned empty.');
        }
      } catch (err) {
        console.warn('⚠️ OpenRouter threw exception:', err);
      }
    } else {
      console.warn('⚠️ OPENROUTER_API_KEY not set — all providers exhausted.');
    }

    console.error(
      '❌ All AI providers failed or exhausted. Using service fallback.',
    );
    return '';
  }

  async getHint(
    question: string,
    options: string[],
    correctAnswer: string,
    hintLevel: 1 | 2 | 3 = 1,
    studentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  ): Promise<{ hint: string }> {
    const system = `You are a friendly English tutor helping ${studentLevel} students learn English through stories.
Give hints that guide without revealing the answer directly.
Hint level ${hintLevel}/3: ${
      hintLevel === 1
        ? 'Give a very vague hint about the topic or context.'
        : hintLevel === 2
          ? 'Give a more specific hint about the grammar rule or vocabulary involved.'
          : 'Give a strong hint that almost reveals the answer, but still make the student think.'
    }
Always respond in simple English appropriate for a ${studentLevel} student. Max 2 sentences.`;

    const userMessage = `Question: "${question}"
Options: ${options.join(', ')}
Correct answer: ${correctAnswer}
Give a level ${hintLevel} hint.`;

    const hint = await this.callGemini(system, userMessage);
    return { hint };
  }

  async getBatchFeedback(
    wrongs: {
      index: number;
      question: string;
      selected: string;
      correctAnswer: string;
    }[],
    studentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  ): Promise<{ index: number; feedback: string; explanation: string }[]> {
    if (!wrongs || wrongs.length === 0) return [];

    const system = `You are a kind English tutor for ${studentLevel} students.
      For each wrong answer below, give brief feedback explaining the mistake.
      Use simple encouraging language. Max 2 sentences per item.
      Respond ONLY with valid JSON array, no markdown:
      [
        { "index": 0, "feedback": "...", "explanation": "..." },
        { "index": 1, "feedback": "...", "explanation": "..." }
      ]`;

    const userMessage = `Wrong answers:
      ${wrongs
        .map(
          (w) =>
            `index ${w.index}: question="${w.question}" | student="${w.selected}" | correct="${w.correctAnswer}"`,
        )
        .join('\n')}`;

    const raw = await this.callGemini(system, userMessage);

    if (!raw) {
      return wrongs.map((w) => ({
        index: w.index,
        feedback: 'Not quite right, but keep trying!',
        explanation: `The correct answer is: "${w.correctAnswer}"`,
      }));
    }

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return wrongs.map((w) => ({
        index: w.index,
        feedback: 'Not quite right, but keep trying!',
        explanation: `The correct answer is: "${w.correctAnswer}"`,
      }));
    }
  }

  async generateQuestionsFromStory(
    storyTitle: string,
    storyText: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    count: 5 | 10 | 15 = 5,
  ): Promise<{ questions: GeneratedQuestion[] }> {
    const system = `You are an expert English teacher creating quiz questions for ${level} students.
      Generate ${count} multiple-choice questions based on the story provided.
      Mix question types: vocabulary, comprehension, grammar in context.
      Each question must have exactly 4 options and one correct answer.
      Respond ONLY with valid JSON, no markdown, no explanation:
      {
        "questions": [
          {
            "text": "question text",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "A",
            "points": 1,
            "type": "vocabulary|comprehension|grammar"
          }
        ]
      }`;

    const userMessage = `Story title: "${storyTitle}"
      Level: ${level}
      Story text:
      ${storyText.slice(0, 3000)}`;

    const raw = await this.callGemini(system, userMessage);

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return { questions: parsed.questions };
    } catch {
      throw new InternalServerErrorException(
        'Failed to parse generated questions. Try again.',
      );
    }
  }

  async explainGrammar(
    phrase: string,
    context: string,
    studentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  ): Promise<{ explanation: string; examples: string[] }> {
    const system = `You are a friendly English grammar teacher for ${studentLevel} students.
      Explain the grammar rule or vocabulary meaning in simple terms.
      Always give 2 short example sentences.
      Respond ONLY with valid JSON: {"explanation": "...", "examples": ["...", "..."]}`;

    const userMessage = `Phrase: "${phrase}"
      Context from story: "${context}"
      Explain this for a ${studentLevel} student.`;

    const raw = await this.callGemini(system, userMessage);

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return {
        explanation: raw,
        examples: [],
      };
    }
  }

  async getGeneralFeedback(details: any[], studentLevel = 'beginner') {
    if (!details || details.length === 0) {
      return {
        strengths: 'Good effort!',
        improvements: 'Keep practicing.',
        topicsToStudy: ['grammar', 'vocabulary'],
      };
    }

    const correct = details.filter((d) => d.correct).length;
    const total = details.length;
    const pct = Math.round((correct / total) * 100);

    const wrongOnes = details
      .filter((d) => !d.correct)
      .slice(0, 5)
      .map((d) => ({
        question: d.question,
        selected: d.selected,
        correctAnswer: d.correctAnswer,
      }));

    const system = `You are an English teacher reviewing a ${studentLevel} student's quiz.
      Analyze the student's mistakes and strengths.
      Write:
      - 1 short paragraph about what the student did well
      - 1 short paragraph about what the student needs to improve
      - 1 list of topics the student should study (grammar/vocabulary)
      Use simple English appropriate for a ${studentLevel} student.
      Respond ONLY in valid JSON, no markdown:
      {
        "strengths": "...",
        "improvements": "...",
        "topicsToStudy": ["...", "..."]
      }`;

    const userMessage = `Score: ${correct}/${total} (${pct}%)
      Wrong answers (up to 5):
      ${JSON.stringify(wrongOnes, null, 2)}`;

    const raw = await this.callGemini(system, userMessage);

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        strengths:
          pct >= 70
            ? `Great job! You got ${correct}/${total} correct.`
            : `You got ${correct}/${total}. Keep going!`,
        improvements: 'Review the story and focus on the words you missed.',
        topicsToStudy: ['vocabulary', 'reading comprehension'],
      };
    }
  }

  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userProgress?: {
      totalResults: number;
      avgScore: number;
      recentMistakes: string[];
      level: string;
    },
  ): Promise<{ reply: string }> {
    const progressContext = userProgress
      ? `
      STUDENT PROFILE (use this to personalize every response):
      - Level: ${userProgress.level}
      - Quizzes completed: ${userProgress.totalResults}
      - Average score: ${userProgress.avgScore}% ${
        userProgress.avgScore < 50
          ? '— they are struggling, be extra encouraging'
          : userProgress.avgScore < 75
            ? '— decent progress, push them a bit more'
            : '— doing great, challenge them'
      }
      - Topics they keep getting wrong: ${
        userProgress.recentMistakes.length > 0
          ? userProgress.recentMistakes.slice(0, 8).join(', ')
          : 'none recorded yet'
      }

      IMPORTANT: If the student asks something vague like "why do I keep failing" or "what should I study", 
      ALWAYS reference their specific weak topics from the list above.
      Give concrete advice based on their actual mistakes — never give generic answers.
      If they have no mistakes yet, encourage them to try a quiz first.
      `
      : '';

    const system = `You are Alex, a native English speaker and casual friend who helps people learn English naturally.
      You do NOT teach like a textbook. You talk like a real person — relaxed, funny when appropriate, direct.
      Instead of grammar rules, you use examples from real life, movies, music, social media, and everyday situations.
      You give honest opinions. You point out what sounds unnatural vs what a native would actually say.
      You celebrate progress genuinely, not with fake enthusiasm.
      When the student makes a mistake, you correct it naturally mid-conversation like a friend would.
      Keep responses short — max 3-4 sentences unless the student asks for more.
      Always respond in English, but if the student writes in Spanish, gently answer in both so they understand.
      ${progressContext}`;

    // Construir historial para Gemini
    const lastMessages = messages.slice(-10); // máximo 10 turnos de contexto
    const userMessage = lastMessages[lastMessages.length - 1]?.content ?? '';

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const url = `${this.apiUrl}?key=${geminiKey}`;
        const contents = lastMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { role: 'system', parts: [{ text: system }] },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { reply: text };
        }
      } catch (err) {
        console.warn('⚠️ Gemini chat error:', err);
      }
    }

    const reply = await this.callGemini(
      system,
      lastMessages
        .map((m) => `${m.role === 'user' ? 'Student' : 'Alex'}: ${m.content}`)
        .join('\n'),
    );

    return {
      reply:
        reply ||
        "Hey! I'm having a little trouble right now. Try again in a sec!",
    };
  }

  async parseDocumentContent(
    rawText: string,
    parsed: any,
  ): Promise<{
    contentType: 'verbs' | 'vocabulary' | 'story' | 'mixed';
    title: string;
    summary: string;
    verbs: {
      infinitive: string;
      pastSimple: string;
      pastParticiple: string;
      spanish: string;
      example: string;
    }[];
    vocabulary: {
      word: string;
      type: string;
      definition: string;
      spanish: string;
      example: string;
    }[];
    paragraphs: string[];
  }> {
    const system = `You are a language learning content analyzer.
Analyze the provided text and detect what type of content it is, then extract structured data.

Content types:
- "verbs": if the text is primarily a list of English verbs (regular or irregular)
- "vocabulary": if the text is primarily a vocabulary/word list with definitions
- "story": if the text is a story, passage, or article
- "mixed": if it contains a mix of the above

Rules:
- For "verbs": fill the verbs array with each verb entry. If past simple or participle are missing, infer them if you know them, otherwise leave empty string.
- Always generate at least one simple English sentence as "example" for each verb, using any of its forms.
- For "vocabulary": fill the vocabulary array. Infer the Spanish translation if not provided. Always generate one simple English sentence as "example" using the word.
- For "story" or "mixed": split the text into clean paragraphs (array of strings, each paragraph a string). Also extract any verbs/vocabulary that appear highlighted or listed separately.
- Always generate a short title (max 6 words) summarizing what the document is about.
- Always write a brief summary (2-3 sentences) describing the content.
- The "spanish" field is always the Spanish translation of the word.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "contentType": "verbs|vocabulary|story|mixed",
  "title": "...",
  "summary": "...",
  "verbs": [...],
  "vocabulary": [...],
  "paragraphs": [...]
}`;

    const userInput = `
RAW TEXT:
${rawText}

PARSED DATA (may contain errors, improve it):
${JSON.stringify(parsed, null, 2)}

Instructions:
- Use BOTH the raw text and parsed data
- Fix parsing mistakes
- Complete missing fields
- Improve examples
- Detect more verbs and vocabulary
- Do NOT lose information from raw text
`;

    const raw = await this.callGemini(system, userInput);

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return {
        contentType: 'story',
        title: 'Uploaded Document',
        summary: rawText.slice(0, 200),
        verbs: [],
        vocabulary: [],
        paragraphs: rawText
          .split('\n')
          .map((p) => p.trim())
          .filter((p) => p.length > 10),
      };
    }
  }

  async reviewWriting(
    userText: string,
    targetWords: string[],
    documentContext: string,
  ): Promise<{
    score: number;
    usedWords: string[];
    missedWords: string[];
    corrections: { original: string; suggestion: string; reason: string }[];
    summary: string;
    encouragement: string;
  }> {
    const system = `You are a friendly English writing coach for language learners.
      Review the student's text and provide detailed feedback.

      Evaluate:
      1. Grammar and spelling errors — list each one with a suggestion and short reason.
      2. Which target words from the list the student used correctly.
      3. Which target words from the list were NOT used.
      4. An overall score from 0 to 100 based on: grammar accuracy (40%), use of target vocabulary (40%), and natural sentence flow (20%).
      5. A 2-sentence summary of their writing quality.
      6. One sentence of genuine encouragement personalized to their performance.

      Respond ONLY with valid JSON, no markdown:
      {
        "score": 78,
        "usedWords": ["ran", "written"],
        "missedWords": ["spoken", "gone"],
        "corrections": [
          {
            "original": "She go to school",
            "suggestion": "She went to school",
            "reason": "Use past tense 'went' for past events."
          }
        ],
        "summary": "...",
        "encouragement": "..."
      }`;

    const userMessage = `Target words from the document: ${targetWords.slice(0, 30).join(', ')}
      Document context: "${documentContext.slice(0, 300)}"
      Student's text: "${userText}"`;

    const raw = await this.callGemini(system, userMessage);

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return {
        score: 0,
        usedWords: [],
        missedWords: targetWords.slice(0, 5),
        corrections: [],
        summary: 'Could not analyze the text. Please try again.',
        encouragement: 'Keep writing! Practice makes perfect.',
      };
    }
  }
  /**
   * Evalúa el dictado: compara lo que el usuario escribió vs el texto original.
   * Tolera errores menores de ortografía y puntuación.
   */
  async evaluateDictation(
    originalText: string,
    userText: string,
  ): Promise<{
    score: number;
    accuracy: number;
    wordsCorrect: number;
    wordsTotal: number;
    errors: {
      original: string;
      typed: string;
      type: 'spelling' | 'missing' | 'extra' | 'wrong';
    }[];
    feedback: string;
    encouragement: string;
  }> {
    // Evaluación local rápida (sin IA) para score base
    const localResult = this.evaluateDictationLocally(originalText, userText);

    // Si el score es perfecto o casi perfecto, no gastamos tokens de IA
    if (localResult.accuracy >= 95) {
      return {
        ...localResult,
        feedback: 'Excellent! Almost perfect dictation.',
        encouragement: 'Your listening and spelling are on point!',
      };
    }

    const system = `You are an English dictation evaluator for language learners.
Compare the original text with what the student typed.
Be tolerant with minor punctuation and capitalization differences — those are NOT errors.
Focus on: missing words, extra words, wrong words, and spelling mistakes.

Respond ONLY with valid JSON, no markdown:
{
  "errors": [
    { "original": "word", "typed": "wrod", "type": "spelling" },
    { "original": "quickly", "typed": "", "type": "missing" },
    { "original": "", "typed": "the", "type": "extra" },
    { "original": "run", "typed": "ran", "type": "wrong" }
  ],
  "feedback": "2-sentence summary of the student's performance",
  "encouragement": "1 short encouraging sentence"
}`;

    const userMessage = `Original text: "${originalText}"
Student typed: "${userText}"

Identify only real errors (ignore punctuation and capitalization differences).`;

    const raw = await this.callGemini(system, userMessage);

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(clean);
      return {
        ...localResult,
        errors: aiResult.errors ?? localResult.errors,
        feedback: aiResult.feedback ?? 'Good effort!',
        encouragement: aiResult.encouragement ?? 'Keep practicing!',
      };
    } catch {
      return {
        ...localResult,
        feedback: `You got ${localResult.wordsCorrect} out of ${localResult.wordsTotal} words right.`,
        encouragement: 'Keep listening and practicing!',
      };
    }
  }

  /**
   * Evaluación local de dictado — sin IA, para score base y fallback.
   */
  private evaluateDictationLocally(originalText: string, userText: string) {
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .replace(/[.,!?;:'"()\-]/g, '')
        .trim();

    const originalWords = normalize(originalText).split(/\s+/).filter(Boolean);
    const userWords = normalize(userText).split(/\s+/).filter(Boolean);

    let correct = 0;
    const errors: {
      original: string;
      typed: string;
      type: 'spelling' | 'missing' | 'extra' | 'wrong';
    }[] = [];

    const maxLen = Math.max(originalWords.length, userWords.length);

    for (let i = 0; i < originalWords.length; i++) {
      const orig = originalWords[i];
      const typed = userWords[i] ?? '';

      if (!typed) {
        errors.push({ original: orig, typed: '', type: 'missing' });
      } else if (orig === typed) {
        correct++;
      } else if (this.levenshtein(orig, typed) <= 2) {
        // Typo tolerable — cuenta como casi correcto pero registra error
        correct += 0.5;
        errors.push({ original: orig, typed, type: 'spelling' });
      } else {
        errors.push({ original: orig, typed, type: 'wrong' });
      }
    }

    // Palabras extra que el usuario escribió de más
    for (let i = originalWords.length; i < userWords.length; i++) {
      errors.push({ original: '', typed: userWords[i], type: 'extra' });
    }

    const accuracy =
      originalWords.length > 0
        ? Math.round((correct / originalWords.length) * 100)
        : 0;

    return {
      score: accuracy,
      accuracy,
      wordsCorrect: Math.round(correct),
      wordsTotal: originalWords.length,
      errors,
      feedback: '',
      encouragement: '',
    };
  }

  /**
   * Distancia de Levenshtein para detectar typos tolerables.
   */
  private levenshtein(a: string, b: string): number {
    const m = a.length,
      n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * Evalúa el shadowing: compara lo que el usuario dijo (transcripción del SpeechRecognition)
   * con el texto original que debía repetir.
   */
  async evaluateShadowing(
    originalText: string,
    spokenText: string,
  ): Promise<{
    score: number;
    accuracy: number;
    wordsCorrect: number;
    wordsTotal: number;
    missedWords: string[];
    mispronounced: { expected: string; heard: string }[];
    feedback: string;
    tip: string;
  }> {
    const localResult = this.evaluateShadowingLocally(originalText, spokenText);

    if (localResult.accuracy >= 90) {
      return {
        ...localResult,
        feedback: 'Great pronunciation! You nailed it.',
        tip: 'Try increasing the speed for more challenge.',
      };
    }

    const system = `You are an English pronunciation coach evaluating a shadowing exercise.
      The student listened to a sentence and repeated it out loud.
      The speech recognition captured what they said.

      Compare and identify:
      1. Words they clearly mispronounced (speech recognition heard something different)
      2. Words they skipped entirely
      3. Give ONE specific, actionable pronunciation tip based on the main error pattern

      Keep feedback encouraging and practical.
      Respond ONLY with valid JSON, no markdown:
      {
        "mispronounced": [
          { "expected": "thought", "heard": "taught" }
        ],
        "feedback": "You got most words right! Focus on the 'th' sound.",
        "tip": "Practice the 'th' sound by placing your tongue between your teeth."
      }`;

    const userMessage = `Original sentence: "${originalText}"
      Speech recognition heard: "${spokenText}"`;

    const raw = await this.callGemini(system, userMessage);

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(clean);
      return {
        ...localResult,
        mispronounced: aiResult.mispronounced ?? localResult.mispronounced,
        feedback:
          aiResult.feedback ??
          `You got ${localResult.wordsCorrect}/${localResult.wordsTotal} words.`,
        tip: aiResult.tip ?? 'Keep practicing out loud!',
      };
    } catch {
      return {
        ...localResult,
        feedback: `You got ${localResult.wordsCorrect} out of ${localResult.wordsTotal} words.`,
        tip: 'Keep practicing out loud!',
      };
    }
  }

  /**
   * Evaluación local de shadowing — sin IA.
   */
  private evaluateShadowingLocally(originalText: string, spokenText: string) {
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .replace(/[.,!?;:'"()\-]/g, '')
        .trim();

    const originalWords = normalize(originalText).split(/\s+/).filter(Boolean);
    const spokenWords = normalize(spokenText).split(/\s+/).filter(Boolean);
    const spokenSet = new Set(spokenWords);

    let correct = 0;
    const missedWords: string[] = [];
    const mispronounced: { expected: string; heard: string }[] = [];

    for (const word of originalWords) {
      if (spokenSet.has(word)) {
        correct++;
      } else {
        // Buscar si hay una palabra parecida (posible error de pronunciación capturado por STT)
        const close = spokenWords.find(
          (sw) => this.levenshtein(word, sw) <= 2 && sw.length > 2,
        );
        if (close) {
          correct += 0.5;
          mispronounced.push({ expected: word, heard: close });
        } else {
          missedWords.push(word);
        }
      }
    }

    const accuracy =
      originalWords.length > 0
        ? Math.round((correct / originalWords.length) * 100)
        : 0;

    return {
      score: accuracy,
      accuracy,
      wordsCorrect: Math.round(correct),
      wordsTotal: originalWords.length,
      missedWords,
      mispronounced,
      feedback: '',
      tip: '',
    };
  }
}

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  type: 'vocabulary' | 'comprehension' | 'grammar';
}
