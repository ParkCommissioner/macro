'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api-client';
import { EntryCard } from '@/components/EntryCard';
import { DailySnapshot } from '@/components/DailySnapshot';

interface NutritionalRange {
  min: number;
  mid: number;
  max: number;
}

interface EntryItem {
  id: string;
  entry_id: string;
  name: string;
  calories: NutritionalRange;
  protein: NutritionalRange;
  carbs: NutritionalRange;
  fat: NutritionalRange;
  fiber: NutritionalRange;
  confidence: 'low' | 'medium' | 'high';
  created_at: string;
}

interface Entry {
  id: string;
  user_id: string;
  raw_text: string;
  timestamp: string;
  created_at: string;
  items: EntryItem[];
}

const PAGE_SIZE = 20;

function aggregateItemTotals(items: EntryItem[]) {
  return {
    calories: {
      min: items.reduce((s, i) => s + i.calories.min, 0),
      mid: items.reduce((s, i) => s + i.calories.mid, 0),
      max: items.reduce((s, i) => s + i.calories.max, 0),
    },
    protein: {
      min: items.reduce((s, i) => s + i.protein.min, 0),
      mid: items.reduce((s, i) => s + i.protein.mid, 0),
      max: items.reduce((s, i) => s + i.protein.max, 0),
    },
    carbs: {
      min: items.reduce((s, i) => s + i.carbs.min, 0),
      mid: items.reduce((s, i) => s + i.carbs.mid, 0),
      max: items.reduce((s, i) => s + i.carbs.max, 0),
    },
    fat: {
      min: items.reduce((s, i) => s + i.fat.min, 0),
      mid: items.reduce((s, i) => s + i.fat.mid, 0),
      max: items.reduce((s, i) => s + i.fat.max, 0),
    },
    fiber: {
      min: items.reduce((s, i) => s + i.fiber.min, 0),
      mid: items.reduce((s, i) => s + i.fiber.mid, 0),
      max: items.reduce((s, i) => s + i.fiber.max, 0),
    },
  };
}

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'yesterday';
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-24 rounded-lg skeleton" />
      ))}
    </div>
  );
}

export default function LogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await api.entries.list({ limit: PAGE_SIZE, offset });
      if (append) {
        setEntries((prev) => [...prev, ...data.entries]);
      } else {
        setEntries(data.entries);
      }
      setHasMore(data.has_more);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadData(entries.length, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, loadData, entries.length]);

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);
    try {
      await api.entries.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteItem = async (entryId: string, itemId: string) => {
    if (deletingItemId) return;

    setDeletingItemId(itemId);
    try {
      await api.entries.deleteItem(entryId, itemId);
      setEntries((prev) => {
        const updated = prev.map((e) => {
          if (e.id !== entryId) return e;
          const newItems = e.items.filter((i) => i.id !== itemId);
          return { ...e, items: newItems };
        });
        // Remove entries with no items left
        return updated.filter((e) => e.items.length > 0);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeletingItemId(null);
    }
  };

  // Group entries by date
  const entriesByDate = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const date = entry.timestamp.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));

  function buildSnapshotData(date: string, dayEntries: Entry[]) {
    const allItems = dayEntries.flatMap((e) => e.items);
    const totals = aggregateItemTotals(allItems);
    return {
      date,
      totals,
      entries: dayEntries.map((e) => ({
        id: e.id,
        raw_text: e.raw_text,
        timestamp: e.timestamp,
        totals: aggregateItemTotals(e.items),
        item_count: e.items.length,
      })),
      entry_count: dayEntries.length,
    };
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 safe-area-pt">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-[var(--text-primary)]">entry log</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {total === 0
            ? 'no entries yet'
            : `${total} total ${total === 1 ? 'entry' : 'entries'}`}
        </p>
      </motion.div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-dashed border-[var(--error)]/30 bg-[var(--error)]/5 p-4 text-center">
          <p className="text-sm text-[var(--error)]">! {error}</p>
          <button
            onClick={() => loadData()}
            className="mt-2 text-xs text-[var(--error)] underline hover:no-underline"
          >
            retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">no entries yet</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            go to today to log your first meal
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-header">
                  {formatDateHeading(date)}
                </h2>
                <DailySnapshot data={buildSnapshotData(date, entriesByDate[date])} compact />
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {entriesByDate[date].map((entry) => (
                    <motion.div
                      key={entry.id}
                      layout
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <EntryCard
                        id={entry.id}
                        rawText={entry.raw_text}
                        timestamp={entry.timestamp}
                        totals={aggregateItemTotals(entry.items)}
                        items={entry.items}
                        onDelete={() => handleDelete(entry.id)}
                        onDeleteItem={(itemId) => handleDeleteItem(entry.id, itemId)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {/* Load more trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isLoadingMore && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--bg-overlay)] border-t-[var(--accent)]" />
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
