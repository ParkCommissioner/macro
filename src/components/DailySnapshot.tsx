'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface NutritionalRange {
  min: number;
  mid: number;
  max: number;
}

interface SnapshotData {
  date: string;
  totals: {
    calories: NutritionalRange;
    protein: NutritionalRange;
    carbs: NutritionalRange;
    fat: NutritionalRange;
    fiber: NutritionalRange;
  };
  entries: Array<{
    raw_text: string;
    timestamp: string;
    totals: {
      calories: NutritionalRange;
    };
  }>;
  entry_count: number;
}

function StaticMacroRing({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const size = 120;
  const strokeWidth = 14;
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
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#141414" strokeWidth={strokeWidth} />
        {total > 0 && (
          <>
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#60a5fa" strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={`${proteinLength} ${circumference}`} strokeDashoffset={-proteinOffset} />
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#fbbf24" strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={`${carbsLength} ${circumference}`} strokeDashoffset={-carbsOffset} />
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f87171" strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={`${fatLength} ${circumference}`} strokeDashoffset={-fatOffset} />
          </>
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3f3f46' }}>total</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#e4e4e7', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(total)}<span style={{ fontSize: 14, fontWeight: 400, color: '#71717a' }}>g</span>
        </span>
      </div>
    </div>
  );
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function DailySnapshot({ data }: { data: SnapshotData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#050505',
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const file = new File([blob], `macros-${data.date}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Macros — ${formatDateLong(data.date)}`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `macros-${data.date}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  const { totals } = data;
  const calMid = totals.calories.mid;
  const calSpread = totals.calories.max - totals.calories.min;
  const showRange = calSpread > calMid * 0.25;

  return (
    <>
      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex items-center gap-1.5 rounded-md border border-[var(--bg-overlay)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {sharing ? 'generating...' : 'share snapshot'}
      </button>

      {/* Hidden card for capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={cardRef}
          style={{
            width: 440,
            padding: 32,
            backgroundColor: '#050505',
            color: '#e4e4e7',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: 16,
            border: '1px solid #141414',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatDateLong(data.date)}</div>
            <div style={{ fontSize: 13, color: '#3f3f46', marginTop: 4 }}>
              {data.entry_count} {data.entry_count === 1 ? 'meal' : 'meals'} logged
            </div>
          </div>

          {/* Calories */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3f3f46' }}>calories</div>
            <div style={{ fontSize: 44, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 6 }}>
              {showRange ? (
                <>{Math.round(totals.calories.min)}<span style={{ color: '#3f3f46' }}>-</span>{Math.round(totals.calories.max)}</>
              ) : (
                Math.round(calMid)
              )}
            </div>
            <div style={{ fontSize: 13, color: '#3f3f46' }}>kcal</div>
          </div>

          {/* Ring + Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 24, justifyContent: 'center' }}>
            <StaticMacroRing protein={totals.protein.mid} carbs={totals.carbs.mid} fat={totals.fat.mid} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'protein', value: totals.protein.mid, color: '#60a5fa' },
                { label: 'carbs', value: totals.carbs.mid, color: '#fbbf24' },
                { label: 'fat', value: totals.fat.mid, color: '#f87171' },
              ].map((m) => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: m.color }} />
                  <span style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', width: 58 }}>{m.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(m.value)}<span style={{ color: '#3f3f46', fontWeight: 400 }}>g</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Meals list */}
          {data.entries.length > 0 && (
            <div style={{ borderTop: '1px solid #141414', paddingTop: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3f3f46', marginBottom: 10 }}>meals</div>
              {data.entries.map((entry, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', fontSize: 14, lineHeight: 1.4 }}>
                  <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#3f3f46', fontSize: 12, flexShrink: 0 }}>[{formatTime(entry.timestamp)}]</span>
                    <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{entry.raw_text}</span>
                  </div>
                  <span style={{ color: '#71717a', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 12, fontSize: 13 }}>
                    {Math.round(entry.totals.calories.mid)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Watermark */}
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#1a1a1a', letterSpacing: '0.1em' }}>
            MACRO
          </div>
        </div>
      </div>
    </>
  );
}
