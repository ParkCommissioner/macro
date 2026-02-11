import Anthropic from '@anthropic-ai/sdk';
import { LLMParsedFood, LLMParsedItem } from './types';

// System prompt from spec (~188 tokens)
const SYSTEM_PROMPT = `You parse food descriptions into nutritional data. Return JSON only.

Schema: {"items":[{"name":"string","calories":{"min":n,"mid":n,"max":n},"protein":{"min":n,"mid":n,"max":n},"carbs":{"min":n,"mid":n,"max":n},"fat":{"min":n,"mid":n,"max":n},"fiber":{"min":n,"mid":n,"max":n},"confidence":"low|medium|high"}]}

Rules:
- Split compound inputs into separate items
- All values in grams except calories (kcal)
- Vague inputs: wide ranges, low confidence
- Precise inputs (quantities, brands): tight ranges, high confidence
- mid = most likely value
- min/max = reasonable bounds (not extreme outliers)`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Validate that a parsed item has correct structure
function isValidParsedItem(item: unknown): item is LLMParsedItem {
  if (typeof item !== 'object' || item === null) return false;

  const i = item as Record<string, unknown>;

  // Check required fields
  if (typeof i.name !== 'string') return false;
  if (!['low', 'medium', 'high'].includes(i.confidence as string)) return false;

  // Check nutritional ranges
  const rangeFields = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  for (const field of rangeFields) {
    const range = i[field] as Record<string, unknown> | undefined;
    if (!range || typeof range !== 'object') return false;
    if (typeof range.min !== 'number' || typeof range.mid !== 'number' || typeof range.max !== 'number') {
      return false;
    }
  }

  return true;
}

// Parse food description with Claude Haiku
export async function parseFoodWithLLM(rawText: string): Promise<LLMParsedFood> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: rawText },
      { role: 'assistant', content: '{' }, // Prefill to enforce JSON-only response
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from LLM');
  }

  // The response continues from "{", so prepend it when parsing
  let parsed: unknown;
  try {
    parsed = JSON.parse('{' + content.text);
  } catch (e) {
    console.error('LLM returned invalid JSON:', content.text);
    throw new Error('Failed to parse LLM response as JSON');
  }

  // Validate structure
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('LLM response is not an object');
  }

  const response_ = parsed as Record<string, unknown>;

  if (!Array.isArray(response_.items)) {
    throw new Error('LLM response missing items array');
  }

  // Validate each item
  const items: LLMParsedItem[] = [];
  for (const item of response_.items) {
    if (!isValidParsedItem(item)) {
      console.error('Invalid item in LLM response:', item);
      throw new Error('LLM response contains invalid item');
    }
    items.push(item);
  }

  return { items };
}
