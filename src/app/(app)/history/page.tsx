'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api-client';

interface NutritionalRange {
  min: number;
  mid: number;
  max: number;
}

interface DailySummary {
  date: string;
  totals: {
    calories: NutritionalRange;
    protein: NutritionalRange;
    carbs: NutritionalRange;
    fat: NutritionalRange;
    fiber: NutritionalRange;
  };
  entry_count: number;
}

interface HistoryData {
  days: DailySummary[];
  period: { from: string; to: string };
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
];

const MACROS = [
  { key: 'protein', label: 'Protein', color: '#60a5fa' },
  { key: 'carbs', label: 'Carbs', color: '#fbbf24' },
  { key: 'fat', label: 'Fat', color: '#f87171' },
] as const;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-3 shadow-2xl">
      <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">{formatDate(label || '')}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 py-0.5 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[var(--text-secondary)]">{entry.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-[var(--text-primary)]">{Math.round(entry.value)}g</span>
        </div>
      ))}
    </div>
  );
}

function CaloriesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const mid = payload.find(p => p.name === 'calories');

  return (
    <div className="rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-3 shadow-2xl">
      <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">{formatDate(label || '')}</p>
      {mid && (
        <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{Math.round(mid.value)} kcal</p>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [selectedRange, setSelectedRange] = useState(30);
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMacros, setActiveMacros] = useState<Set<string>>(new Set(['protein']));
  const [stacked, setStacked] = useState(false);

  const toggleMacro = (key: string) => {
    setActiveMacros(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least one
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const historyData = await api.dashboard.history(selectedRange);
      setData(historyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = data?.days
    .slice()
    .reverse()
    .map((day) => ({
      date: day.date,
      caloriesMin: day.totals.calories.min,
      caloriesMid: day.totals.calories.mid,
      caloriesMax: day.totals.calories.max,
      protein: day.totals.protein.mid,
      carbs: day.totals.carbs.mid,
      fat: day.totals.fat.mid,
    })) || [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6 safe-area-pt">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Trends</h1>
        <p className="text-sm text-[var(--text-secondary)]">Nutrition over time</p>
      </motion.div>

      {/* Range Selector */}
      <div className="mb-6 flex gap-1.5 rounded-xl bg-[var(--bg-elevated)] p-1">
        {RANGES.map((range) => (
          <button
            key={range.days}
            onClick={() => setSelectedRange(range.days)}
            className={`relative flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
              selectedRange === range.days
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {selectedRange === range.days && (
              <motion.div
                layoutId="range-bg"
                className="absolute inset-0 rounded-lg bg-[var(--bg-overlay)]"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <span className="relative z-10">{range.label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-56 skeleton" />
          <div className="h-56 skeleton" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-[var(--error)]/5 p-4 text-center">
          <p className="text-sm text-[var(--error)]">{error}</p>
          <button onClick={loadData} className="mt-2 text-xs text-[var(--error)] underline">retry</button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="rounded-xl bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No data for this period</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Start logging meals to see trends</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Calories Chart */}
          <div className="overflow-hidden rounded-2xl bg-[var(--bg-elevated)]">
            <div className="px-4 pt-4 pb-1">
              <h2 className="text-xs font-semibold text-[var(--text-secondary)]">Calories</h2>
            </div>
            <div className="px-2 pb-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-overlay)" opacity={0.4} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate}
                      tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CaloriesTooltip />} />
                    <Area type="monotone" dataKey="caloriesMid" stroke="var(--accent)" strokeWidth={2}
                      fill="url(#calGrad)" name="calories" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Macros Chart */}
          <div className="overflow-hidden rounded-2xl bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-xs font-semibold text-[var(--text-secondary)]">Macros</h2>
              <button
                onClick={() => setStacked(!stacked)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  stacked
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-bright)]'
                    : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]'
                }`}
              >
                {stacked ? 'Stacked' : 'Layered'}
              </button>
            </div>

            {/* Macro toggles */}
            <div className="flex gap-2 px-4 pb-2">
              {MACROS.map((macro) => {
                const isOn = activeMacros.has(macro.key);
                return (
                  <button
                    key={macro.key}
                    onClick={() => toggleMacro(macro.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isOn
                        ? 'bg-opacity-100'
                        : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: isOn ? `${macro.color}18` : 'var(--bg-overlay)',
                      color: isOn ? macro.color : 'var(--text-muted)',
                    }}
                  >
                    <div
                      className="h-2 w-2 rounded-full transition-transform"
                      style={{
                        backgroundColor: macro.color,
                        transform: isOn ? 'scale(1)' : 'scale(0.6)',
                        opacity: isOn ? 1 : 0.4,
                      }}
                    />
                    {macro.label}
                  </button>
                );
              })}
            </div>

            <div className="px-2 pb-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {MACROS.map((macro) => (
                        <linearGradient key={macro.key} id={`${macro.key}Grad`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={macro.color} stopOpacity={stacked ? 0.6 : 0.2} />
                          <stop offset="100%" stopColor={macro.color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-overlay)" opacity={0.4} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate}
                      tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {MACROS.filter(m => activeMacros.has(m.key)).map((macro) => (
                      <Area
                        key={macro.key}
                        type="monotone"
                        dataKey={macro.key}
                        stackId={stacked ? 'macros' : undefined}
                        stroke={macro.color}
                        strokeWidth={2}
                        fill={`url(#${macro.key}Grad)`}
                        name={macro.label}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
