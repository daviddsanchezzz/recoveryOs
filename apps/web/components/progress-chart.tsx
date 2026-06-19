'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, Tooltip, ResponsiveContainer,
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
    return (
      <div className="bg-ink text-white text-xs font-semibold rounded-xl px-3 py-1.5 shadow-lg pointer-events-none">
        {fmt(Number(payload[0].value))}
      </div>
    );
  };

  if (!ready) return <div style={{ height: 220 }} />;

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 2, left: 2, bottom: 0 }} barCategoryGap="32%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={tickStyle}
            interval={2}
          />
          <Tooltip
            content={tooltipContent}
            cursor={{ fill: '#13201a', fillOpacity: 0.04 }}
          />
          <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 2, left: 2, bottom: 0 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={tickStyle}
          interval={2}
        />
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
  );
}
