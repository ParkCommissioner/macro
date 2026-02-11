import {
  NutritionalRange,
  NutritionalTotals,
  EntryItem,
  Confidence,
  DailySummary,
} from './types';

// Empty totals for initialization
export function emptyTotals(): NutritionalTotals {
  return {
    calories: { min: 0, mid: 0, max: 0 },
    protein: { min: 0, mid: 0, max: 0 },
    carbs: { min: 0, mid: 0, max: 0 },
    fat: { min: 0, mid: 0, max: 0 },
    fiber: { min: 0, mid: 0, max: 0 },
  };
}

// Add two nutritional ranges
function addRanges(a: NutritionalRange, b: NutritionalRange): NutritionalRange {
  return {
    min: a.min + b.min,
    mid: a.mid + b.mid,
    max: a.max + b.max,
  };
}

// Aggregate items into totals
export function aggregateItems(items: EntryItem[]): NutritionalTotals {
  if (items.length === 0) {
    return emptyTotals();
  }

  return items.reduce((totals, item) => ({
    calories: addRanges(totals.calories, item.calories),
    protein: addRanges(totals.protein, item.protein),
    carbs: addRanges(totals.carbs, item.carbs),
    fat: addRanges(totals.fat, item.fat),
    fiber: addRanges(totals.fiber, item.fiber),
  }), emptyTotals());
}

// Aggregate multiple totals (for daily/weekly aggregation)
export function aggregateTotals(totalsList: NutritionalTotals[]): NutritionalTotals {
  if (totalsList.length === 0) {
    return emptyTotals();
  }

  return totalsList.reduce((acc, totals) => ({
    calories: addRanges(acc.calories, totals.calories),
    protein: addRanges(acc.protein, totals.protein),
    carbs: addRanges(acc.carbs, totals.carbs),
    fat: addRanges(acc.fat, totals.fat),
    fiber: addRanges(acc.fiber, totals.fiber),
  }), emptyTotals());
}

// Get the minimum confidence from a list of items
// One low-confidence item makes the whole aggregation low-confidence
export function aggregateConfidence(items: { confidence: Confidence }[]): Confidence {
  if (items.length === 0) return 'high';

  const hasLow = items.some(i => i.confidence === 'low');
  const hasMedium = items.some(i => i.confidence === 'medium');

  if (hasLow) return 'low';
  if (hasMedium) return 'medium';
  return 'high';
}

// Compute weekly average from daily data
export function computeWeeklyAverage(days: DailySummary[]): {
  averages: NutritionalTotals;
  daily_ranges: {
    calories: { min: number; max: number };
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
    fiber: { min: number; max: number };
  };
} {
  const n = days.length;

  if (n === 0) {
    return {
      averages: emptyTotals(),
      daily_ranges: {
        calories: { min: 0, max: 0 },
        protein: { min: 0, max: 0 },
        carbs: { min: 0, max: 0 },
        fat: { min: 0, max: 0 },
        fiber: { min: 0, max: 0 },
      },
    };
  }

  // Averages: mean of daily min/mid/max
  const averages: NutritionalTotals = {
    calories: {
      min: Math.round(days.reduce((s, d) => s + d.totals.calories.min, 0) / n),
      mid: Math.round(days.reduce((s, d) => s + d.totals.calories.mid, 0) / n),
      max: Math.round(days.reduce((s, d) => s + d.totals.calories.max, 0) / n),
    },
    protein: {
      min: Math.round(days.reduce((s, d) => s + d.totals.protein.min, 0) / n),
      mid: Math.round(days.reduce((s, d) => s + d.totals.protein.mid, 0) / n),
      max: Math.round(days.reduce((s, d) => s + d.totals.protein.max, 0) / n),
    },
    carbs: {
      min: Math.round(days.reduce((s, d) => s + d.totals.carbs.min, 0) / n),
      mid: Math.round(days.reduce((s, d) => s + d.totals.carbs.mid, 0) / n),
      max: Math.round(days.reduce((s, d) => s + d.totals.carbs.max, 0) / n),
    },
    fat: {
      min: Math.round(days.reduce((s, d) => s + d.totals.fat.min, 0) / n),
      mid: Math.round(days.reduce((s, d) => s + d.totals.fat.mid, 0) / n),
      max: Math.round(days.reduce((s, d) => s + d.totals.fat.max, 0) / n),
    },
    fiber: {
      min: Math.round(days.reduce((s, d) => s + d.totals.fiber.min, 0) / n),
      mid: Math.round(days.reduce((s, d) => s + d.totals.fiber.mid, 0) / n),
      max: Math.round(days.reduce((s, d) => s + d.totals.fiber.max, 0) / n),
    },
  };

  // Daily ranges: min and max daily mid values observed
  const daily_ranges = {
    calories: {
      min: Math.min(...days.map(d => d.totals.calories.mid)),
      max: Math.max(...days.map(d => d.totals.calories.mid)),
    },
    protein: {
      min: Math.min(...days.map(d => d.totals.protein.mid)),
      max: Math.max(...days.map(d => d.totals.protein.mid)),
    },
    carbs: {
      min: Math.min(...days.map(d => d.totals.carbs.mid)),
      max: Math.max(...days.map(d => d.totals.carbs.mid)),
    },
    fat: {
      min: Math.min(...days.map(d => d.totals.fat.mid)),
      max: Math.max(...days.map(d => d.totals.fat.mid)),
    },
    fiber: {
      min: Math.min(...days.map(d => d.totals.fiber.mid)),
      max: Math.max(...days.map(d => d.totals.fiber.mid)),
    },
  };

  return { averages, daily_ranges };
}

// Validate that ranges are properly ordered (min <= mid <= max)
export function validateRange(range: NutritionalRange): boolean {
  return range.min <= range.mid && range.mid <= range.max && range.min >= 0;
}

// Validate all ranges in totals
export function validateTotals(totals: NutritionalTotals): boolean {
  return (
    validateRange(totals.calories) &&
    validateRange(totals.protein) &&
    validateRange(totals.carbs) &&
    validateRange(totals.fat) &&
    validateRange(totals.fiber)
  );
}
