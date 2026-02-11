'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface MacroRingProps {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
  strokeWidth?: number;
}

const COLORS = {
  protein: 'var(--protein)',
  carbs: 'var(--carbs)',
  fat: 'var(--fat)',
};

export function MacroRing({ protein, carbs, fat, size = 180, strokeWidth = 18 }: MacroRingProps) {
  const total = protein + carbs + fat;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const proteinPercent = total > 0 ? protein / total : 0;
  const carbsPercent = total > 0 ? carbs / total : 0;
  const fatPercent = total > 0 ? fat / total : 0;

  const proteinLength = circumference * proteinPercent;
  const carbsLength = circumference * carbsPercent;
  const fatLength = circumference * fatPercent;

  const proteinOffset = 0;
  const carbsOffset = proteinLength;
  const fatOffset = proteinLength + carbsLength;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {/* Glow filters for each macro */}
          <filter id="glow-protein" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-carbs" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-fat" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring with subtle pattern */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-overlay)"
          strokeWidth={strokeWidth}
          strokeDasharray="2 4"
          opacity={0.5}
        />

        {total > 0 && (
          <>
            {/* Protein segment */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={COLORS.protein}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${proteinLength} ${circumference}`}
              strokeDashoffset={-proteinOffset}
              filter="url(#glow-protein)"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${proteinLength} ${circumference}` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Carbs segment */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={COLORS.carbs}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${carbsLength} ${circumference}`}
              strokeDashoffset={-carbsOffset}
              filter="url(#glow-carbs)"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${carbsLength} ${circumference}` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            />

            {/* Fat segment */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={COLORS.fat}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${fatLength} ${circumference}`}
              strokeDashoffset={-fatOffset}
              filter="url(#glow-fat)"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${fatLength} ${circumference}` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </>
        )}
      </svg>

      {/* Center label - terminal style */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">total</span>
        <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)] glow-text">
          <AnimatedNumber value={total} />
          <span className="text-base font-normal text-[var(--text-secondary)]">g</span>
        </span>
      </div>
    </div>
  );
}

interface MacroLegendProps {
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroLegend({ protein, carbs, fat }: MacroLegendProps) {
  const total = protein + carbs + fat;

  const items = [
    { label: 'protein', value: protein, color: COLORS.protein, percent: total > 0 ? (protein / total) * 100 : 0 },
    { label: 'carbs', value: carbs, color: COLORS.carbs, percent: total > 0 ? (carbs / total) * 100 : 0 },
    { label: 'fat', value: fat, color: COLORS.fat, percent: total > 0 ? (fat / total) * 100 : 0 },
  ];

  return (
    <div className="flex flex-col gap-2 w-full">
      {items.map((item) => (
        <motion.div
          key={item.label}
          className="flex items-center gap-3 rounded-md bg-[var(--bg-base)] px-3 py-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="h-2 w-2 rounded-sm"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 8px ${item.color}`,
            }}
          />
          <span className="flex-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
            {item.label}
          </span>
          <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
            <AnimatedNumber value={Math.round(item.value)} />
            <span className="text-[var(--text-muted)]">g</span>
          </span>
          <span className="w-10 text-right text-xs tabular-nums text-[var(--text-muted)]">
            <AnimatedNumber value={Math.round(item.percent)} />%
          </span>
        </motion.div>
      ))}
    </div>
  );
}
