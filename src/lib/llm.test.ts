import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mock function for the create method
const mockCreate = vi.fn();

// Mock the Anthropic SDK before importing the module under test
vi.mock('@anthropic-ai/sdk', () => {
  // Create a proper class constructor
  function MockAnthropic() {
    return {
      messages: {
        create: mockCreate,
      },
    };
  }
  return { default: MockAnthropic };
});

// Mock environment variable
vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

describe('parseFoodWithLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to get fresh import
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse a simple food description', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          // Note: we prepend "{" so the response starts without it
          text: '"items":[{"name":"banana","calories":{"min":90,"mid":105,"max":120},"protein":{"min":1,"mid":1,"max":2},"carbs":{"min":23,"mid":27,"max":31},"fat":{"min":0,"mid":0,"max":1},"fiber":{"min":2,"mid":3,"max":4},"confidence":"high"}]}',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    // Import after mock is set up
    const { parseFoodWithLLM } = await import('./llm');
    const result = await parseFoodWithLLM('a banana');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('banana');
    expect(result.items[0].calories.mid).toBe(105);
    expect(result.items[0].confidence).toBe('high');
  });

  it('should parse multiple items from compound input', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: '"items":[{"name":"eggs","calories":{"min":140,"mid":155,"max":180},"protein":{"min":10,"mid":12,"max":14},"carbs":{"min":0,"mid":1,"max":2},"fat":{"min":10,"mid":11,"max":13},"fiber":{"min":0,"mid":0,"max":0},"confidence":"medium"},{"name":"toast with butter","calories":{"min":130,"mid":150,"max":180},"protein":{"min":3,"mid":4,"max":5},"carbs":{"min":14,"mid":16,"max":20},"fat":{"min":6,"mid":8,"max":10},"fiber":{"min":1,"mid":1,"max":2},"confidence":"medium"}]}',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const { parseFoodWithLLM } = await import('./llm');
    const result = await parseFoodWithLLM('eggs and toast with butter');

    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('eggs');
    expect(result.items[1].name).toBe('toast with butter');
  });

  it('should throw error for invalid JSON response', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: 'This is not valid JSON',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const { parseFoodWithLLM } = await import('./llm');
    await expect(parseFoodWithLLM('some food')).rejects.toThrow('Failed to parse LLM response as JSON');
  });

  it('should throw error for missing items array', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: '"food": "banana"}',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const { parseFoodWithLLM } = await import('./llm');
    await expect(parseFoodWithLLM('a banana')).rejects.toThrow('LLM response missing items array');
  });

  it('should throw error for non-text response type', async () => {
    const mockResponse = {
      content: [
        {
          type: 'image',
          source: {},
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const { parseFoodWithLLM } = await import('./llm');
    await expect(parseFoodWithLLM('a banana')).rejects.toThrow('Unexpected response type');
  });

  it('should validate required fields in parsed items', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          // Missing confidence field
          text: '"items":[{"name":"banana","calories":{"min":90,"mid":105,"max":120},"protein":{"min":1,"mid":1,"max":2},"carbs":{"min":23,"mid":27,"max":31},"fat":{"min":0,"mid":0,"max":1},"fiber":{"min":2,"mid":3,"max":4}}]}',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const { parseFoodWithLLM } = await import('./llm');
    await expect(parseFoodWithLLM('a banana')).rejects.toThrow('LLM response contains invalid item');
  });

  it('should call Anthropic API with correct parameters', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: '"items":[{"name":"test","calories":{"min":0,"mid":0,"max":0},"protein":{"min":0,"mid":0,"max":0},"carbs":{"min":0,"mid":0,"max":0},"fat":{"min":0,"mid":0,"max":0},"fiber":{"min":0,"mid":0,"max":0},"confidence":"high"}]}',
        },
      ],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const { parseFoodWithLLM } = await import('./llm');
    await parseFoodWithLLM('test food');

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: expect.stringContaining('You parse food descriptions into nutritional data'),
      messages: [
        { role: 'user', content: 'test food' },
        { role: 'assistant', content: '{' },
      ],
    });
  });
});
