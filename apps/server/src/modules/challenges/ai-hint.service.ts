import { env } from '../../config/index.js';

export class AiHintUnavailableError extends Error {}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export async function generateAiHint(input: {
  statement: string;
  language: string;
  sourceCode: string;
}): Promise<string> {
  if (!env.groqApiKey) throw new AiHintUnavailableError('AI hints are not configured.');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model: env.groqModel,
      temperature: 0.2,
      max_tokens: 180,
      messages: [
        {
          role: 'system',
          content:
            'Give concise educational programming hints. Do not provide a complete solution or rewrite the student code.',
        },
        {
          role: 'user',
          content: [
            `Challenge:\n${input.statement.slice(0, 12_000)}`,
            `Language: ${input.language}`,
            `Student code:\n${input.sourceCode.slice(0, 20_000)}`,
          ].join('\n\n'),
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new AiHintUnavailableError(`Groq returned ${String(response.status)}.`);
  const payload = (await response.json()) as GroqResponse;
  const hint = payload.choices?.[0]?.message?.content?.trim();
  if (!hint) throw new AiHintUnavailableError('AI provider returned no hint.');
  return hint.slice(0, 4_000);
}
