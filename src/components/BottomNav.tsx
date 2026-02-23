'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Today', icon: TodayIcon },
  { href: '/history', label: 'Trends', icon: HistoryIcon },
  { href: '/log', label: 'Log', icon: LogIcon },
  { href: '/profile', label: 'Profile', icon: ProfileIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--bg-overlay)]/50 bg-[var(--bg-base)]/80 backdrop-blur-xl safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive ? 'text-[var(--accent-bright)]' : 'text-[var(--text-muted)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -top-[1px] h-[2px] w-6 rounded-full bg-[var(--accent)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <Icon className="h-[22px] w-[22px]" isActive={isActive} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TodayIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={isActive ? 2 : 1.5} stroke="currentColor">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function HistoryIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={isActive ? 2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-4 4 4 4-8 5 6" />
    </svg>
  );
}

function LogIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={isActive ? 2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" d="M8 6h12M8 12h12M8 18h8" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ProfileIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={isActive ? 2 : 1.5} stroke="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
