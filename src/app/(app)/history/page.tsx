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

const MACRO_COLORS = {
  protein: 'var(--protein)',
  carbs: 'var(--carbs)',
  fat: 'var(--fat)',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-md border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-3 shadow-xl">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{formatDate(label || '')}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: entry.color, boxShadow: `0 0 4px ${entry.color}` }} />
          <span className="text-[var(--text-secondary)]">{entry.name}:</span>
          <span className="font-medium tabular-nums text-[var(--text-primary)]">{Math.round(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-14 rounded-md skeleton" />
        ))}
      </div>
      <div className="h-56 rounded-lg skeleton" />
      <div className="h-56 rounded-lg skeleton" />
    </div>
  );
}

export default function HistoryPage() {
  const [selectedRange, setSelectedRange] = useState(30);
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Transform data for charts (reverse so oldest is first)
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
        <h1 className="text-xl font-bold text-[var(--text-primary)]">history</h1>
        <p className="text-sm text-[var(--text-muted)]">nutrition trends over time</p>
      </motion.div>

      {/* Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex gap-2"
      >
        {RANGES.map((range) => (
          <button
            key={range.days}
            onClick={() => setSelectedRange(range.days)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
              selectedRange === range.days
                ? 'bg-[var(--accent)] text-[var(--bg-base)] glow-sm'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {range.label}
          </button>
        ))}
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
      ) : chartData.length === 0 ? (
        <div className="rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">no data for this period</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            start logging meals to see trends
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-5"
        >
          {/* Calories Chart with Confidence Bands */}
          <div className="overflow-hidden rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)]">
            <div className="border-b border-[var(--bg-overlay)] bg-[var(--bg-base)] px-4 py-2">
              <h2 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">daily calories</h2>
            </div>
            <div className="p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                      <filter id="glow-line">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--bg-overlay)" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}
                      axisLine={{ stroke: 'var(--bg-overlay)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}
                      axisLine={{ stroke: 'var(--bg-overlay)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {/* Confidence band (min to max) */}
                    <Area
                      type="monotone"
                      dataKey="caloriesMax"
                      stroke="none"
                      fill="url(#confidenceBand)"
                      name="max"
                    />
                    <Area
                      type="monotone"
                      dataKey="caloriesMin"
                      stroke="none"
                      fill="var(--bg-base)"
                      name="min"
                    />
                    {/* Mid line */}
                    <Area
                      type="monotone"
                      dataKey="caloriesMid"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      fill="url(#caloriesGradient)"
                      name="calories"
                      filter="url(#glow-line)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Macros Stacked Area Chart */}
          <div className="overflow-hidden rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)]">
            <div className="border-b border-[var(--bg-overlay)] bg-[var(--bg-base)] px-4 py-2">
              <h2 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">macronutrients</h2>
            </div>
            <div className="p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="proteinGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MACRO_COLORS.protein} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={MACRO_COLORS.protein} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="carbsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MACRO_COLORS.carbs} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={MACRO_COLORS.carbs} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MACRO_COLORS.fat} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={MACRO_COLORS.fat} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--bg-overlay)" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}
                      axisLine={{ stroke: 'var(--bg-overlay)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}
                      axisLine={{ stroke: 'var(--bg-overlay)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="protein"
                      stackId="1"
                      stroke={MACRO_COLORS.protein}
                      fill="url(#proteinGradient)"
                      name="protein (g)"
                    />
                    <Area
                      type="monotone"
                      dataKey="carbs"
                      stackId="1"
                      stroke={MACRO_COLORS.carbs}
                      fill="url(#carbsGradient)"
                      name="carbs (g)"
                    />
                    <Area
                      type="monotone"
                      dataKey="fat"
                      stackId="1"
                      stroke={MACRO_COLORS.fat}
                      fill="url(#fatGradient)"
                      name="fat (g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="mt-3 flex justify-center gap-5">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: MACRO_COLORS.protein, boxShadow: `0 0 4px ${MACRO_COLORS.protein}` }} />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">protein</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: MACRO_COLORS.carbs, boxShadow: `0 0 4px ${MACRO_COLORS.carbs}` }} />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">carbs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: MACRO_COLORS.fat, boxShadow: `0 0 4px ${MACRO_COLORS.fat}` }} />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">fat</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
