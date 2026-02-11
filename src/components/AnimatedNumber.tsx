'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (n: number) => string;
}

export function AnimatedNumber({ value, duration = 0.6, className, formatFn }: AnimatedNumberProps) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (current) =>
    formatFn ? formatFn(Math.round(current)) : Math.round(current).toLocaleString()
  );
  const [displayValue, setDisplayValue] = useState('0');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsAnimating(true);
      const timeout = setTimeout(() => setIsAnimating(false), duration * 1000);
      prevValue.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value, duration]);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on('change', (v) => setDisplayValue(v));
  }, [display]);

  return (
    <motion.span
      className={`tabular-nums ${className || ''}`}
      animate={isAnimating ? { textShadow: ['0 0 8px var(--accent-glow)', '0 0 0px transparent'] } : {}}
      transition={{ duration: duration }}
    >
      {displayValue}
    </motion.span>
  );
}

interface RangeDisplayProps {
  min: number;
  mid: number;
  max: number;
  unit?: string;
  showRange?: boolean;
  className?: string;
}

export function RangeDisplay({ min, mid, max, unit = '', showRange = true, className }: RangeDisplayProps) {
  const spread = max - min;
  const isWide = spread > mid * 0.3;

  if (!showRange || !isWide) {
    return (
      <span className={className}>
        <AnimatedNumber value={mid} />
        {unit && <span className="text-[var(--text-muted)]">{unit}</span>}
      </span>
    );
  }

  return (
    <span className={`${className} confidence-low`}>
      <AnimatedNumber value={min} />
      <span className="text-[var(--text-muted)]">-</span>
      <AnimatedNumber value={max} />
      {unit && <span className="text-[var(--text-muted)]">{unit}</span>}
    </span>
  );
}
