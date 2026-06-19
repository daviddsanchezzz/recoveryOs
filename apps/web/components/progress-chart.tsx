'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ChartPoint } from '../lib/progress-metrics';

interface ProgressChartProps {
  data: ChartPoint[];
  type: 'bar' | 'line';
  color: string;
  formatValue?: (v: number) => string;
}

export function ProgressChart({ data, type, color, formatValue }: ProgressChartProps) {
  // Defer recharts render to client only to avoid SSR mismatch
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const fmt = formatValue ?? String;

  const tickStyle = {
    fontSize: 10,
    fill: '#13201a',
    fillOpacity: 0.30,
    fontWeight: 600,
  } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length || payload[0].value == null) return null;
    const point = payload[0].payload as ChartPoint;
    return (
      <div className="bg-ink text-white rounded-xl px-3 py-2 shadow-lg pointer-events-none space-y-0.5">
        <p className="text-[10px] text-white/50 font-medium leading-none">{point.rangeLabel}</p>
        <p className="text-xs font-bold leading-none">{fmt(Number(payload[0].value))}</p>
      </div>
    );
  };

  if (!ready) return <div style={{ height: 220 }} />;

  // Tight Y-domain with padding — needed for line charts where range is narrow (e.g. weight 78-79 kg)
  const validValues = data.filter((p) => p.value != null).map((p) => Number(p.value));
  const dataMin = validValues.length > 0 ? Math.min(...validValues) : 0;
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 100;
  const pad     = Math.max((dataMax - dataMin) * 0.4, type === 'line' ? 0.5 : 1);
  const yDomain: [number, number] = [
    Math.round((dataMin - pad) * 10) / 10,
    Math.round((dataMax + pad) * 10) / 10,
  ];

  if (type === 'bar') {
    return (
      <div className="[&_svg]:outline-none [&_svg]:focus:outline-none">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="32%">
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={tickStyle} interval={2} />
            <YAxis domain={[0, yDomain[1]]} hide />
            <Tooltip content={tooltipContent} cursor={{ fill: '#13201a', fillOpacity: 0.04 }} />
            <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="[&_svg]:outline-none [&_svg]:focus:outline-none">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={tickStyle} interval={2} />
          <YAxis domain={yDomain} hide />
          <Tooltip content={tooltipContent} cursor={false} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
