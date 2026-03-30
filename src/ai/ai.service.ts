import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

  // FIX 1: callGemini mejorado — loguea el error real de la API
  // Antes: si la key faltaba o el modelo fallaba, devolvía '' silenciosamente
  // Ahora: loguea el status + body completo para que puedas ver exactamente qué falla
  // ─────────────────────────────────────────────────────────────────

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
      // Gemini falló (rate limit, etc.) → fallback sin crashear
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
      // Si el JSON falla igual devolvemos fallback útil
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
    // Si no hay details aún (array vacío) retornar fallback sin llamar a la API
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

    // Solo mandar las incorrectas al prompt para no gastar tokens
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
}

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  type: 'vocabulary' | 'comprehension' | 'grammar';
}
