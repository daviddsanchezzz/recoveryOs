'use client';

// Shared SVG line chart for weight evolution — used in WeightScreen and ProgressScreen

const W   = 300;
const H   = 120;
const PAD = { top: 16, right: 8, bottom: 28, left: 8 };

function buildLinePath(entries: { weightKg: number }[], minW: number, range: number): string {
  const n   = entries.length;
  const pts = entries.map((e, i) => ({
    x: PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right),
    y: PAD.top  + (1 - (e.weightKg - minW) / range) * (H - PAD.top - PAD.bottom),
  }));

  if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;

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
  return `${buildLinePath(entries, minW, range)} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
}

export interface WeightChartEntry {
  id: string;
  date: string;
  weightKg: number;
}

interface WeightLineChartProps {
  entries: WeightChartEntry[];
  latestId?: string;
  /** Height of the SVG element in px */
  height?: number;
}

export function WeightLineChart({ entries, latestId, height = 140 }: WeightLineChartProps) {
  if (entries.length < 2) return null;

  const rawMax = entries.reduce((m, e) => Math.max(m, e.weightKg), 0);
  const rawMin = entries.reduce((m, e) => Math.min(m, e.weightKg), 999);
  const yPad   = (rawMax - rawMin) * 0.3 || 0.5;
  const maxW   = rawMax + yPad;
  const minW   = rawMin - yPad;
  const range  = maxW - minW;
  const n      = entries.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id="wlg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a1a1a" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0"    />
        </linearGradient>
        <clipPath id="wlclip">
          <rect x={PAD.left} y={PAD.top}
            width={W - PAD.left - PAD.right}
            height={H - PAD.top - PAD.bottom}
          />
        </clipPath>
      </defs>

      {/* Y grid lines + inline labels */}
      {[rawMax, (rawMax + rawMin) / 2, rawMin].map((val) => {
        const y = PAD.top + (1 - (val - minW) / range) * (H - PAD.top - PAD.bottom);
        return (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="#1a1a1a" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD.left + 3} y={y - 3}
              fontSize="7" fill="#1a1a1a" fillOpacity="0.30" textAnchor="start">
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={buildAreaPath(entries, minW, range)} fill="url(#wlg)" clipPath="url(#wlclip)" />

      {/* Line */}
      <path d={buildLinePath(entries, minW, range)}
        fill="none" stroke="#1a1a1a" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + X labels */}
      {entries.map((entry, i) => {
        const cx = PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
        const cy = PAD.top  + (1 - (entry.weightKg - minW) / range) * (H - PAD.top - PAD.bottom);
        const isLatest  = entry.id === latestId;
        const labelStep = Math.round(n / 4);
        const showLabel = n <= 7 || i === 0 || i === n - 1 || (i % labelStep === 0 && i < n - 2);
        return (
          <g key={entry.id}>
            {isLatest ? (
              <>
                <circle cx={cx} cy={cy} r={6}   fill="#1a1a1a" fillOpacity="0.12" />
                <circle cx={cx} cy={cy} r={3.5} fill="#1a1a1a" />
              </>
            ) : (
              <circle cx={cx} cy={cy} r={2.5} fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
            )}
            {showLabel && (
              <text x={cx} y={H - 2}
                fontSize="7.5" fill="#1a1a1a" fillOpacity="0.35" textAnchor="middle">
                {entry.date.slice(5).replace('-', '/')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
