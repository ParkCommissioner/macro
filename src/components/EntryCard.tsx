'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface NutritionalRange {
  min: number;
  mid: number;
  max: number;
}

interface EntryItem {
  id: string;
  name: string;
  calories: NutritionalRange;
  protein: NutritionalRange;
  carbs: NutritionalRange;
  fat: NutritionalRange;
  fiber: NutritionalRange;
  confidence: 'low' | 'medium' | 'high';
}

interface EntryCardProps {
  id: string;
  rawText: string;
  timestamp: string;
  totals: {
    calories: NutritionalRange;
    protein: NutritionalRange;
    carbs: NutritionalRange;
    fat: NutritionalRange;
    fiber: NutritionalRange;
  };
  items?: EntryItem[];
  itemCount?: number;
  onDelete?: () => void;
  onEdit?: () => void;
  onDeleteItem?: (itemId: string) => void;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function ConfidenceIndicator({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'border-dashed border-[var(--warning)] text-[var(--warning)] opacity-70',
    medium: 'border-solid border-[var(--accent-dim)] text-[var(--accent)]',
    high: 'border-solid border-[var(--accent)] text-[var(--accent)]',
  };

  const labels = {
    low: '~est',
    medium: 'mid',
    high: 'hi',
  };

  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}

export function EntryCard({
  rawText,
  timestamp,
  totals,
  items,
  itemCount,
  onDelete,
  onEdit,
  onDeleteItem,
}: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const proteinMid = totals.protein.mid;
  const carbsMid = totals.carbs.mid;
  const fatMid = totals.fat.mid;
  const totalMacros = proteinMid + carbsMid + fatMid;

  const proteinPercent = totalMacros > 0 ? (proteinMid / totalMacros) * 100 : 0;
  const carbsPercent = totalMacros > 0 ? (carbsMid / totalMacros) * 100 : 0;
  const fatPercent = totalMacros > 0 ? (fatMid / totalMacros) * 100 : 0;

  const calorieSpread = totals.calories.max - totals.calories.min;
  const showRange = calorieSpread > totals.calories.mid * 0.25;
  const isUncertain = showRange;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-lg border bg-[var(--bg-elevated)] ${
        isUncertain
          ? 'border-dashed border-[var(--bg-overlay)] confidence-low'
          : 'border-solid border-[var(--bg-overlay)]'
      }`}
    >
      {/* Card header bar */}
      <div className="flex items-center justify-between border-b border-[var(--bg-overlay)] bg-[var(--bg-base)] px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          [{formatTime(timestamp)}]
        </span>
        {(itemCount !== undefined || items) && (
          <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
            {itemCount ?? items?.length} item{(itemCount ?? items?.length) !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 text-left"
          >
            <p className="text-sm text-[var(--text-primary)]">{rawText}</p>
          </button>

          <div className="text-right">
            <div className={`text-lg font-bold tabular-nums ${isUncertain ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
              {showRange ? (
                <>
                  <AnimatedNumber value={totals.calories.min} />
                  <span className="text-[var(--text-muted)]">-</span>
                  <AnimatedNumber value={totals.calories.max} />
                </>
              ) : (
                <AnimatedNumber value={totals.calories.mid} />
              )}
              <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">kcal</span>
            </div>
          </div>
        </div>

        {/* Macro bar with grid overlay effect */}
        <div className="relative mt-3 flex h-1.5 overflow-hidden rounded-sm bg-[var(--bg-base)]">
          {totalMacros > 0 && (
            <>
              <motion.div
                className="h-full"
                style={{ backgroundColor: 'var(--protein)' }}
                initial={{ width: 0 }}
                animate={{ width: `${proteinPercent}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="h-full"
                style={{ backgroundColor: 'var(--carbs)' }}
                initial={{ width: 0 }}
                animate={{ width: `${carbsPercent}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
              <motion.div
                className="h-full"
                style={{ backgroundColor: 'var(--fat)' }}
                initial={{ width: 0 }}
                animate={{ width: `${fatPercent}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </>
          )}
        </div>

        {/* Macro values */}
        <div className="mt-2 flex justify-between text-[11px]">
          <span className="tabular-nums">
            <span className="font-medium text-[var(--protein)]">{Math.round(proteinMid)}</span>
            <span className="text-[var(--text-muted)]">g P</span>
          </span>
          <span className="tabular-nums">
            <span className="font-medium text-[var(--carbs)]">{Math.round(carbsMid)}</span>
            <span className="text-[var(--text-muted)]">g C</span>
          </span>
          <span className="tabular-nums">
            <span className="font-medium text-[var(--fat)]">{Math.round(fatMid)}</span>
            <span className="text-[var(--text-muted)]">g F</span>
          </span>
        </div>
      </div>

      {/* Expanded items */}
      <AnimatePresence>
        {isExpanded && items && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-[var(--bg-overlay)]"
          >
            <div className="space-y-0 divide-y divide-[var(--bg-overlay)]">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 px-3 py-2.5 bg-[var(--bg-base)]">
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)]">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <ConfidenceIndicator confidence={item.confidence} />
                      <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                        {Math.round(item.protein.mid)}P · {Math.round(item.carbs.mid)}C · {Math.round(item.fat.mid)}F
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right text-sm tabular-nums text-[var(--text-secondary)]">
                      {Math.round(item.calories.mid)}
                      <span className="text-[var(--text-muted)]"> kcal</span>
                    </div>
                    {onDeleteItem && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                        className="ml-1 rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
                        title="Remove item"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(onEdit || onDelete) && (
              <div className="flex justify-end gap-2 border-t border-[var(--bg-overlay)] bg-[var(--bg-base)] px-3 py-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="rounded px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                  >
                    edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="rounded px-2 py-1 text-xs text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
                  >
                    delete
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
