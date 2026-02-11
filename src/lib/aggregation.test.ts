import { describe, it, expect } from 'vitest';
import {
  emptyTotals,
  aggregateItems,
  aggregateTotals,
  aggregateConfidence,
  computeWeeklyAverage,
  validateRange,
  validateTotals,
} from './aggregation';
import { EntryItem, NutritionalTotals, DailySummary } from './types';

// Helper to create a mock entry item
function createMockItem(overrides: Partial<EntryItem> = {}): EntryItem {
  return {
    id: 'test-id',
    entry_id: 'entry-id',
    name: 'Test Item',
    calories: { min: 100, mid: 150, max: 200 },
    protein: { min: 10, mid: 15, max: 20 },
    carbs: { min: 20, mid: 30, max: 40 },
    fat: { min: 5, mid: 8, max: 12 },
    fiber: { min: 2, mid: 3, max: 5 },
    confidence: 'high',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('emptyTotals', () => {
  it('should return all zeros', () => {
    const totals = emptyTotals();

    expect(totals.calories).toEqual({ min: 0, mid: 0, max: 0 });
    expect(totals.protein).toEqual({ min: 0, mid: 0, max: 0 });
    expect(totals.carbs).toEqual({ min: 0, mid: 0, max: 0 });
    expect(totals.fat).toEqual({ min: 0, mid: 0, max: 0 });
    expect(totals.fiber).toEqual({ min: 0, mid: 0, max: 0 });
  });
});

describe('aggregateItems', () => {
  it('should return empty totals for empty array', () => {
    const totals = aggregateItems([]);
    expect(totals).toEqual(emptyTotals());
  });

  it('should return same values for single item', () => {
    const item = createMockItem();
    const totals = aggregateItems([item]);

    expect(totals.calories).toEqual(item.calories);
    expect(totals.protein).toEqual(item.protein);
    expect(totals.carbs).toEqual(item.carbs);
    expect(totals.fat).toEqual(item.fat);
    expect(totals.fiber).toEqual(item.fiber);
  });

  it('should sum multiple items correctly', () => {
    const item1 = createMockItem({
      calories: { min: 100, mid: 150, max: 200 },
      protein: { min: 10, mid: 15, max: 20 },
    });
    const item2 = createMockItem({
      calories: { min: 50, mid: 75, max: 100 },
      protein: { min: 5, mid: 8, max: 10 },
    });

    const totals = aggregateItems([item1, item2]);

    expect(totals.calories).toEqual({ min: 150, mid: 225, max: 300 });
    expect(totals.protein).toEqual({ min: 15, mid: 23, max: 30 });
  });

  it('should maintain additive consistency: sum of mids = total mid', () => {
    const items = [
      createMockItem({ calories: { min: 100, mid: 150, max: 200 } }),
      createMockItem({ calories: { min: 200, mid: 250, max: 300 } }),
      createMockItem({ calories: { min: 50, mid: 80, max: 100 } }),
    ];

    const totals = aggregateItems(items);
    const expectedMid = items.reduce((sum, i) => sum + i.calories.mid, 0);

    expect(totals.calories.mid).toBe(expectedMid);
    expect(totals.calories.mid).toBe(480); // 150 + 250 + 80
  });
});

describe('aggregateTotals', () => {
  it('should return empty totals for empty array', () => {
    const result = aggregateTotals([]);
    expect(result).toEqual(emptyTotals());
  });

  it('should sum multiple totals correctly', () => {
    const totals1: NutritionalTotals = {
      calories: { min: 100, mid: 150, max: 200 },
      protein: { min: 10, mid: 15, max: 20 },
      carbs: { min: 20, mid: 30, max: 40 },
      fat: { min: 5, mid: 8, max: 12 },
      fiber: { min: 2, mid: 3, max: 5 },
    };
    const totals2: NutritionalTotals = {
      calories: { min: 200, mid: 250, max: 300 },
      protein: { min: 20, mid: 25, max: 30 },
      carbs: { min: 40, mid: 50, max: 60 },
      fat: { min: 10, mid: 12, max: 15 },
      fiber: { min: 4, mid: 5, max: 7 },
    };

    const result = aggregateTotals([totals1, totals2]);

    expect(result.calories).toEqual({ min: 300, mid: 400, max: 500 });
    expect(result.protein).toEqual({ min: 30, mid: 40, max: 50 });
  });
});

describe('aggregateConfidence', () => {
  it('should return high for empty array', () => {
    expect(aggregateConfidence([])).toBe('high');
  });

  it('should return high when all items are high confidence', () => {
    const items = [
      { confidence: 'high' as const },
      { confidence: 'high' as const },
    ];
    expect(aggregateConfidence(items)).toBe('high');
  });

  it('should return medium when any item is medium confidence', () => {
    const items = [
      { confidence: 'high' as const },
      { confidence: 'medium' as const },
    ];
    expect(aggregateConfidence(items)).toBe('medium');
  });

  it('should return low when any item is low confidence', () => {
    const items = [
      { confidence: 'high' as const },
      { confidence: 'medium' as const },
      { confidence: 'low' as const },
    ];
    expect(aggregateConfidence(items)).toBe('low');
  });

  it('should return low even with one low item', () => {
    const items = [
      { confidence: 'high' as const },
      { confidence: 'low' as const },
    ];
    expect(aggregateConfidence(items)).toBe('low');
  });
});

describe('computeWeeklyAverage', () => {
  it('should return zeros for empty array', () => {
    const { averages, daily_ranges } = computeWeeklyAverage([]);

    expect(averages).toEqual(emptyTotals());
    expect(daily_ranges.calories).toEqual({ min: 0, max: 0 });
  });

  it('should compute averages correctly for multiple days', () => {
    const days: DailySummary[] = [
      {
        date: '2024-01-15',
        totals: {
          calories: { min: 1000, mid: 1500, max: 2000 },
          protein: { min: 80, mid: 100, max: 120 },
          carbs: { min: 150, mid: 200, max: 250 },
          fat: { min: 50, mid: 70, max: 90 },
          fiber: { min: 20, mid: 30, max: 40 },
        },
        entry_count: 3,
      },
      {
        date: '2024-01-16',
        totals: {
          calories: { min: 1200, mid: 1700, max: 2200 },
          protein: { min: 90, mid: 110, max: 130 },
          carbs: { min: 160, mid: 210, max: 260 },
          fat: { min: 55, mid: 75, max: 95 },
          fiber: { min: 22, mid: 32, max: 42 },
        },
        entry_count: 4,
      },
    ];

    const { averages, daily_ranges } = computeWeeklyAverage(days);

    // Average of (1500, 1700) = 1600
    expect(averages.calories.mid).toBe(1600);
    // Average of (1000, 1200) = 1100
    expect(averages.calories.min).toBe(1100);

    // Daily ranges: min of mids = 1500, max of mids = 1700
    expect(daily_ranges.calories.min).toBe(1500);
    expect(daily_ranges.calories.max).toBe(1700);
  });
});

describe('validateRange', () => {
  it('should accept valid ranges', () => {
    expect(validateRange({ min: 0, mid: 50, max: 100 })).toBe(true);
    expect(validateRange({ min: 0, mid: 0, max: 0 })).toBe(true);
    expect(validateRange({ min: 50, mid: 50, max: 50 })).toBe(true);
  });

  it('should reject invalid ranges', () => {
    // min > mid
    expect(validateRange({ min: 100, mid: 50, max: 100 })).toBe(false);
    // mid > max
    expect(validateRange({ min: 0, mid: 100, max: 50 })).toBe(false);
    // negative values
    expect(validateRange({ min: -10, mid: 50, max: 100 })).toBe(false);
  });
});

describe('validateTotals', () => {
  it('should accept valid totals', () => {
    const validTotals: NutritionalTotals = {
      calories: { min: 100, mid: 150, max: 200 },
      protein: { min: 10, mid: 15, max: 20 },
      carbs: { min: 20, mid: 30, max: 40 },
      fat: { min: 5, mid: 8, max: 12 },
      fiber: { min: 2, mid: 3, max: 5 },
    };

    expect(validateTotals(validTotals)).toBe(true);
  });

  it('should reject totals with invalid ranges', () => {
    const invalidTotals: NutritionalTotals = {
      calories: { min: 200, mid: 150, max: 100 }, // Invalid: min > max
      protein: { min: 10, mid: 15, max: 20 },
      carbs: { min: 20, mid: 30, max: 40 },
      fat: { min: 5, mid: 8, max: 12 },
      fiber: { min: 2, mid: 3, max: 5 },
    };

    expect(validateTotals(invalidTotals)).toBe(false);
  });
});
