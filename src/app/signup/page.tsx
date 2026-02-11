'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-[var(--accent)] glow-text">MACRO</h1>
          <p className="text-xs text-[var(--text-muted)]">create your account</p>
        </div>

        {/* Terminal card */}
        <div className="overflow-hidden rounded-lg border border-[var(--bg-overlay)] bg-[var(--bg-elevated)]">
          {/* Card header */}
          <div className="flex items-center gap-2 border-b border-[var(--bg-overlay)] bg-[var(--bg-base)] px-4 py-2">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[var(--fat)] opacity-80" />
              <div className="h-2 w-2 rounded-full bg-[var(--carbs)] opacity-80" />
              <div className="h-2 w-2 rounded-full bg-[var(--accent)] opacity-80" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              register
            </span>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="space-y-3 p-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]">$</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="terminal-input w-full py-2.5 pl-7 pr-3 text-sm"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]">$</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="terminal-input w-full py-2.5 pl-7 pr-3 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                confirm password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]">$</span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="terminal-input w-full py-2.5 pl-7 pr-3 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-[var(--error)]"
              >
                <span>!</span>
                <span>{error}</span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 text-sm"
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </motion.svg>
                  creating account...
                </span>
              ) : (
                'create account'
              )}
            </motion.button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
          already have an account?{' '}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
