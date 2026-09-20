const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export interface AiRuntimeInfo {
  provider: 'openai' | 'gemini';
  configured: boolean;
  model: string;
}

export function getAiRuntimeInfo(): AiRuntimeInfo {
  const provider = String(process.env.AI_PROVIDER || 'openai').trim().toLowerCase() === 'gemini'
    ? 'gemini'
    : 'openai';
  const configured = provider === 'openai'
    ? Boolean(String(process.env.OPENAI_API_KEY || '').trim())
    : Boolean(String(process.env.GEMINI_API_KEY || '').trim());

  return {
    provider,
    configured,
    model: provider === 'openai'
      ? String(process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim()
      : String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
  };
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  return (Array.isArray(data?.output) ? data.output : [])
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item: any) => item?.type === 'output_text')
    .map((item: any) => String(item?.text || ''))
    .join('')
    .trim();
}

export async function createOpenAIStructuredResponse<T>(options: {
  name: string;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 30_000);
  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: String(process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim(),
        instructions: options.instructions,
        input: options.input,
        store: false,
        max_output_tokens: options.maxOutputTokens || 900,
        text: {
          format: {
            type: 'json_schema',
            name: options.name,
            strict: true,
            schema: options.schema,
          },
        },
      }),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}: ${data?.error?.message || 'falha na requisição'}`);
    }

    const outputText = extractOutputText(data);
    if (!outputText) throw new Error('OpenAI não retornou conteúdo de texto');
    return JSON.parse(outputText) as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('OpenAI excedeu o tempo limite de resposta');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
