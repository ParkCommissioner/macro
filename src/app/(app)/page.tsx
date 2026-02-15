'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api-client';
import { FoodInput } from '@/components/FoodInput';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { MacroRing, MacroLegend } from '@/components/MacroRing';
import { EntryCard } from '@/components/EntryCard';
import { DailySnapshot } from '@/components/DailySnapshot';

interface NutritionalRange {
  min: number;
  mid: number;
  max: number;
}

interface TodayData {
  date: string;
  totals: {
    calories: NutritionalRange;
    protein: NutritionalRange;
    carbs: NutritionalRange;
    fat: NutritionalRange;
    fiber: NutritionalRange;
  };
  entries: Array<{
    id: string;
    raw_text: string;
    timestamp: string;
    totals: {
      calories: NutritionalRange;
      protein: NutritionalRange;
      carbs: NutritionalRange;
      fat: NutritionalRange;
      fiber: NutritionalRange;
    };
    item_count: number;
  }>;
  entry_count: number;
}

function CalorieDisplay({ totals }: { totals: { calories: NutritionalRange } }) {
  const { min, mid, max } = totals.calories;
  const spread = max - min;
  const showRange = spread > mid * 0.25;
  const isUncertain = showRange;

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">calories</p>
      <div className="mt-2">
        {showRange ? (
          <div className={`text-4xl font-bold tabular-nums ${isUncertain ? 'confidence-low text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
            <AnimatedNumber value={min} />
            <span className="text-[var(--text-muted)]">-</span>
            <AnimatedNumber value={max} />
          </div>
        ) : (
          <div className="text-5xl font-bold tabular-nums text-[var(--text-primary)] glow-text">
            <AnimatedNumber value={mid} />
          </div>
        )}
        <p className="mt-1 text-sm text-[var(--text-muted)]">kcal</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 rounded-lg skeleton" />
      <div className="flex justify-center">
        <div className="h-44 w-44 rounded-full skeleton" />
      </div>
      <div className="space-y-3">
        <div className="h-24 rounded-lg skeleton" />
        <div className="h-24 rounded-lg skeleton" />
      </div>
    </div>
  );
}

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const todayData = await api.dashboard.today();
      setData(todayData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEntryCreated = () => {
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await api.entries.delete(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'today';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase();
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 safe-area-pt">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {data?.date ? formatDate(data.date) : 'today'}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {data?.entry_count === 0
            ? 'no meals logged yet'
            : `${data?.entry_count} ${data?.entry_count === 1 ? 'meal' : 'meals'} logged`}
        </p>
      </motion.div>

      {/* Food Input - Always visible at top */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <FoodInput onEntryCreated={handleEntryCreated} />
      </motion.div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-dashed border-[var(--error)]/30 bg-[var(--error)]/5 p-4 text-center">
          <p className="text-sm text-[var(--error)]">! {error}</p>
          <button
            onClick={loadData}
            className="mt-2 text-xs text-[var(--error)] underline hover:no-underline"
          >
            retry
          </button>
        </div>
      ) : data ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Calorie Hero */}
          <CalorieDisplay totals={data.totals} />

          {/* Macro Ring & Legend */}
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-5">
            <MacroRing
              protein={data.totals.protein.mid}
              carbs={data.totals.carbs.mid}
              fat={data.totals.fat.mid}
              size={160}
              strokeWidth={16}
            />
            <MacroLegend
              protein={data.totals.protein.mid}
              carbs={data.totals.carbs.mid}
              fat={data.totals.fat.mid}
            />
          </div>

          {/* Share Snapshot */}
          {data.entry_count > 0 && (
            <div className="flex justify-center">
              <DailySnapshot data={data} />
            </div>
          )}

          {/* Today's Entries */}
          {data.entries.length > 0 && (
            <div>
              <h2 className="section-header mb-3">meals</h2>
              <div className="space-y-3">
                {data.entries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <EntryCard
                      id={entry.id}
                      rawText={entry.raw_text}
                      timestamp={entry.timestamp}
                      totals={entry.totals}
                      itemCount={entry.item_count}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
