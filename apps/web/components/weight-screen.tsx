'use client';

import { useState } from 'react';
import { X, Plus, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { WeightSheet } from './weight-sheet';
import { Portal } from './portal';

function relativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

function fullDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// W=width H=height of the SVG viewBox
const W = 300;
const H = 120;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

function buildLinePath(entries: { weightKg: number }[], minW: number, range: number): string {
  const n = entries.length;
  const pts = entries.map((e, i) => ({
    x: PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right),
    y: PAD.top + (1 - (e.weightKg - minW) / range) * (H - PAD.top - PAD.bottom),
  }));

  if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;

  // Catmull-Rom → cubic bezier
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function buildAreaPath(entries: { weightKg: number }[], minW: number, range: number): string {
  const bottom = H - PAD.bottom;
  const firstX = PAD.left;
  const lastX  = PAD.left + (W - PAD.left - PAD.right);
  const line   = buildLinePath(entries, minW, range);
  return `${line} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
}

export function WeightScreen({ onClose }: { onClose: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate]   = useState(() => new Date().toISOString().slice(0, 10));

  const { weightEntries } = useRecoveryStore();

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const chartEntries = sorted.slice(-14);

  // Add padding to Y range so the line isn't flush against top/bottom
  const rawMax = chartEntries.reduce((m, e) => Math.max(m, e.weightKg), 0);
  const rawMin = chartEntries.reduce((m, e) => Math.min(m, e.weightKg), 999);
  const pad    = (rawMax - rawMin) * 0.3 || 0.5;
  const maxW   = rawMax + pad;
  const minW   = rawMin - pad;
  const range  = maxW - minW;

  const latest = sorted[sorted.length - 1];
  const prev   = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const delta  = latest && prev ? Number((latest.weightKg - prev.weightKg).toFixed(1)) : null;

  const TrendIcon = delta === null ? null : delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const trendColor = delta === null ? '' : delta < 0 ? 'text-moss' : delta > 0 ? 'text-ember' : 'text-ink/40';

  return (
    <Portal>
      {/* Full-screen overlay */}
      <div
        className="fixed inset-0 z-[70] bg-canvas flex flex-col animate-slide-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-moss" />
            <h1 className="text-2xl font-bold text-ink">Peso</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center"
          >
            <X size={16} className="text-ink/60" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">

          {/* Latest + delta */}
          {latest && (
            <div className="rounded-4xl bg-ink p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Último</p>
                <p className="text-4xl font-bold text-white mt-1 leading-none">
                  {latest.weightKg.toFixed(1)}
                  <span className="text-lg font-normal text-white/50 ml-1">kg</span>
                </p>
                <p className="text-xs text-white/40 mt-1">{relativeDate(latest.date)}</p>
              </div>
              {TrendIcon && delta !== null && (
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <TrendIcon size={16} className={trendColor} />
                    <span className={`text-xl font-bold ${trendColor}`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">vs anterior</p>
                </div>
              )}
            </div>
          )}

          {/* Line chart */}
          {chartEntries.length >= 2 && (
            <div className="rounded-4xl bg-white shadow-card px-5 pt-5 pb-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/30">
                Evolución — últimas {chartEntries.length} entradas
              </p>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ height: 140 }}
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#1a1a1a" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0"    />
                  </linearGradient>
                  <clipPath id="wclip">
                    <rect
                      x={PAD.left} y={PAD.top}
                      width={W - PAD.left - PAD.right}
                      height={H - PAD.top - PAD.bottom}
                    />
                  </clipPath>
                </defs>

                {/* Y grid lines — 3 evenly spaced within raw data range */}
                {[rawMax, (rawMax + rawMin) / 2, rawMin].map((val) => {
                  const y = PAD.top + (1 - (val - minW) / range) * (H - PAD.top - PAD.bottom);
                  return (
                    <g key={val}>
                      <line
                        x1={PAD.left} y1={y}
                        x2={W - PAD.right} y2={y}
                        stroke="#1a1a1a" strokeOpacity="0.06" strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={PAD.left - 5} y={y + 3.5}
                        fontSize="7.5" fill="#1a1a1a" fillOpacity="0.35" textAnchor="end"
                      >
                        {val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Area gradient fill */}
                <path
                  d={buildAreaPath(chartEntries, minW, range)}
                  fill="url(#wg)"
                  clipPath="url(#wclip)"
                />

                {/* Line */}
                <path
                  d={buildLinePath(chartEntries, minW, range)}
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dots + X-axis date labels */}
                {chartEntries.map((entry, i) => {
                  const n   = chartEntries.length;
                  const cx  = PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
                  const cy  = PAD.top + (1 - (entry.weightKg - minW) / range) * (H - PAD.top - PAD.bottom);
                  const isLatest  = entry.id === latest?.id;
                  const showLabel = n <= 7 || i === 0 || i === n - 1 || i % Math.round(n / 4) === 0;
                  const labelDate = entry.date.slice(5).replace('-', '/'); // MM/DD
                  return (
                    <g key={entry.id}>
                      {isLatest ? (
                        <>
                          <circle cx={cx} cy={cy} r={6} fill="#1a1a1a" fillOpacity="0.12" />
                          <circle cx={cx} cy={cy} r={3.5} fill="#1a1a1a" />
                        </>
                      ) : (
                        <circle cx={cx} cy={cy} r={2.5} fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
                      )}
                      {showLabel && (
                        <text
                          x={cx} y={H - 2}
                          fontSize="7.5" fill="#1a1a1a" fillOpacity="0.35" textAnchor="middle"
                        >
                          {labelDate}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {chartEntries.length === 0 && (
            <div className="rounded-4xl bg-canvas-light border border-sand/40 p-8 flex flex-col items-center gap-2 text-center">
              <Scale size={24} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin registros de peso aún</p>
              <p className="text-xs text-ink/25">Pulsa + para añadir el primero</p>
            </div>
          )}

          {/* History list */}
          {sorted.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
                Historial
              </p>
              {[...sorted].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-3xl bg-white shadow-card px-4 py-3 flex items-center justify-between"
                >
                  <p className="text-sm text-ink/50 capitalize">{fullDate(entry.date)}</p>
                  <p className="text-base font-bold text-ink">
                    {entry.weightKg.toFixed(1)}
                    <span className="text-xs font-normal text-ink/40"> kg</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB — sibling to overlay so iOS fixed positioning works correctly */}
      <div className="fixed bottom-6 right-5 z-[71]">
        <button
          type="button"
          onClick={() => {
            setAddDate(new Date().toISOString().slice(0, 10));
            setShowAdd(true);
          }}
          className="h-14 w-14 rounded-full bg-ink shadow-card-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={22} className="text-white" />
        </button>
      </div>

      <WeightSheet
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        defaultDate={addDate}
      />
    </Portal>
  );
}
