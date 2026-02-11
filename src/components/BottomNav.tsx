'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'today', icon: TodayIcon },
  { href: '/history', label: 'history', icon: HistoryIcon },
  { href: '/log', label: 'log', icon: LogIcon },
  { href: '/profile', label: 'profile', icon: ProfileIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--bg-overlay)] bg-[var(--bg-base)]/95 backdrop-blur-md safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                  style={{ boxShadow: '0 0 10px var(--accent-glow)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5" isActive={isActive} />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TodayIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={isActive ? 2 : 1.5}
      stroke="currentColor"
      style={isActive ? { filter: 'drop-shadow(0 0 4px var(--accent-glow))' } : {}}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path strokeLinecap="round" d="M4 9h16" />
      <path strokeLinecap="round" d="M9 4v5" />
      <path strokeLinecap="round" d="M15 4v5" />
    </svg>
  );
}

function HistoryIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={isActive ? 2 : 1.5}
      stroke="currentColor"
      style={isActive ? { filter: 'drop-shadow(0 0 4px var(--accent-glow))' } : {}}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 18v-8M10 18v-12M15 18v-6M20 18v-10" />
    </svg>
  );
}

function LogIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={isActive ? 2 : 1.5}
      stroke="currentColor"
      style={isActive ? { filter: 'drop-shadow(0 0 4px var(--accent-glow))' } : {}}
    >
      <path strokeLinecap="round" d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function ProfileIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={isActive ? 2 : 1.5}
      stroke="currentColor"
      style={isActive ? { filter: 'drop-shadow(0 0 4px var(--accent-glow))' } : {}}
    >
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
