'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api-client';
import { AnimatedNumber } from '@/components/AnimatedNumber';

interface WeeklyData {
  week: { start: string; end: string };
  averages: {
    calories: { min: number; mid: number; max: number };
    protein: { min: number; mid: number; max: number };
    carbs: { min: number; mid: number; max: number };
    fat: { min: number; mid: number; max: number };
    fiber: { min: number; mid: number; max: number };
  };
  daily_ranges: {
    calories: { min: number; max: number };
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
    fiber: { min: number; max: number };
  };
  days_logged: number;
  consistency_score: number;
}

function StatCard({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)]">
        <AnimatedNumber value={value} />
        {unit && <span className="text-xs font-normal text-[var(--text-muted)]">{unit}</span>}
      </p>
    </div>
  );
}

function ConsistencyRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative h-20 w-20">
      <svg className="h-full w-full -rotate-90">
        <defs>
          <filter id="glow-ring">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--bg-overlay)"
          strokeWidth="6"
          strokeDasharray="2 4"
          opacity={0.5}
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          filter="url(#glow-ring)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold tabular-nums text-[var(--text-primary)] glow-text">
          <AnimatedNumber value={score} />%
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadWeeklyData = useCallback(async () => {
    try {
      const data = await api.dashboard.weekly();
      setWeeklyData(data);
    } catch {
      // Ignore errors - show default state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 safe-area-pt">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-[var(--text-primary)]">profile</h1>
        <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
      </motion.div>

      {/* Weekly Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <h2 className="section-header mb-3">this week</h2>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-lg skeleton" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-lg skeleton" />
              <div className="h-16 rounded-lg skeleton" />
            </div>
          </div>
        ) : weeklyData ? (
          <div className="space-y-3">
            {/* Consistency Card */}
            <div className="flex items-center justify-between overflow-hidden rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)]">
              <div className="border-b border-[var(--bg-overlay)] bg-[var(--bg-base)] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">consistency</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {weeklyData.days_logged}/7 days logged
                </p>
              </div>
              <div className="p-3">
                <ConsistencyRing score={weeklyData.consistency_score} />
              </div>
            </div>

            {/* Average Stats */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="avg calories"
                value={Math.round(weeklyData.averages.calories.mid)}
                unit=" kcal"
              />
              <StatCard
                label="avg protein"
                value={Math.round(weeklyData.averages.protein.mid)}
                unit="g"
              />
              <StatCard
                label="avg carbs"
                value={Math.round(weeklyData.averages.carbs.mid)}
                unit="g"
              />
              <StatCard
                label="avg fat"
                value={Math.round(weeklyData.averages.fat.mid)}
                unit="g"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">no data for this week yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              start logging meals to see your weekly summary
            </p>
          </div>
        )}
      </motion.div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="section-header mb-3">account</h2>

        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)]">
            <div className="border-b border-[var(--bg-overlay)] bg-[var(--bg-base)] px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">email</span>
            </div>
            <div className="p-3">
              <p className="text-sm text-[var(--text-primary)]">{user?.email}</p>
            </div>
          </div>

          <motion.button
            onClick={logout}
            className="w-full rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] p-3 text-left text-sm text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
            whileTap={{ scale: 0.98 }}
          >
            sign out
          </motion.button>
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-center"
      >
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">macro v1.0</p>
        <p className="text-[10px] text-[var(--text-muted)] opacity-60">natural language food tracking</p>
      </motion.div>
    </div>
  );
}
