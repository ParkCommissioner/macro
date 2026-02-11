'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api-client';

interface Suggestion {
  raw_text: string;
  last_used: string;
  use_count: number;
}

interface FoodInputProps {
  onEntryCreated?: () => void;
}

export function FoodInput({ onEntryCreated }: FoodInputProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const data = await api.suggestions.list(5);
        setSuggestions(data.suggestions);
      } catch {
        // Ignore errors loading suggestions
      }
    };
    loadSuggestions();
  }, []);

  const handleSubmit = async (text: string = value) => {
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setShowSuggestions(false);

    try {
      await api.entries.create(text.trim());
      setValue('');
      onEntryCreated?.();
      // Refresh suggestions
      const data = await api.suggestions.list(5);
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full">
      {/* Terminal-style input container */}
      <motion.div
        className={`relative overflow-hidden rounded-lg border transition-all duration-150 ${
          isFocused
            ? 'border-[var(--accent)] glow'
            : 'border-[var(--bg-overlay)]'
        }`}
        animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Input header bar */}
        <div className="flex items-center gap-2 border-b border-[var(--bg-overlay)] bg-[var(--bg-elevated)] px-4 py-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--fat)] opacity-80" />
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--carbs)] opacity-80" />
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] opacity-80" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            food input
          </span>
        </div>

        {/* Input field area */}
        <div className="relative flex items-center bg-[var(--bg-base)]">
          {/* Prompt symbol */}
          <span className="pl-4 text-lg text-[var(--accent)]">$</span>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="type what you ate..."
            disabled={isSubmitting}
            className="flex-1 bg-transparent py-4 pl-2 pr-4 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none disabled:opacity-50"
          />

          {/* Blinking cursor when empty and focused */}
          {isFocused && !value && (
            <motion.span
              className="absolute left-[52px] text-[var(--accent)]"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
            >
              _
            </motion.span>
          )}

          {/* Submit button */}
          <motion.button
            onClick={() => handleSubmit()}
            disabled={!value.trim() || isSubmitting}
            className="mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--bg-base)] transition-all hover:bg-[var(--accent-bright)] disabled:bg-[var(--bg-overlay)] disabled:text-[var(--text-muted)]"
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? (
              <motion.svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </motion.svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && !value && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)]"
            style={{ transformOrigin: 'top' }}
          >
            <div className="section-header px-4 py-2">
              recent entries
            </div>
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={i}
                onClick={() => handleSubmit(suggestion.raw_text)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--bg-overlay)]"
                whileHover={{ x: 4 }}
                transition={{ duration: 0.1 }}
              >
                <span className="text-[var(--accent)]">$</span>
                <span className="flex-1 truncate text-[var(--text-primary)]">{suggestion.raw_text}</span>
                <span className="tabular-nums text-xs text-[var(--text-muted)]">{suggestion.use_count}x</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-2 text-sm text-[var(--error)]"
          >
            <span className="text-[var(--error)]">!</span>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
