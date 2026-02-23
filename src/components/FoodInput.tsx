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
        // Ignore
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
      <div
        className={`flex items-center gap-3 rounded-2xl border bg-[var(--bg-elevated)] px-4 py-3 transition-all duration-200 ${
          isFocused
            ? 'border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-subtle)]'
            : 'border-[var(--bg-overlay)]'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setIsFocused(true); setShowSuggestions(true); }}
          onBlur={() => { setIsFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
          placeholder="What did you eat?"
          disabled={isSubmitting}
          className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none disabled:opacity-50"
        />

        <motion.button
          onClick={() => handleSubmit()}
          disabled={!value.trim() || isSubmitting}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition-all hover:bg-[var(--accent-bright)] disabled:bg-[var(--bg-overlay)] disabled:text-[var(--text-muted)]"
          whileTap={{ scale: 0.92 }}
        >
          {isSubmitting ? (
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && !value && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] shadow-xl"
          >
            <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Recent
            </div>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(suggestion.raw_text)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-overlay)]"
              >
                <span className="flex-1 truncate text-[var(--text-primary)]">{suggestion.raw_text}</span>
                <span className="tabular-nums text-xs text-[var(--text-muted)]">{suggestion.use_count}×</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm text-[var(--error)]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
