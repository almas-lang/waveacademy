'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { RevenueChartData, RevenueGranularity } from '@/types/admin';

interface RevenueChartProps {
  data: RevenueChartData;
}

const granularityOptions: { key: RevenueGranularity; label: string }[] = [
  { key: 'daily', label: '30D' },
  { key: 'weekly', label: '12W' },
  { key: 'monthly', label: '6M' },
];

function formatRupee(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [granularity, setGranularity] = useState<RevenueGranularity>('daily');
  const chartData = data[granularity] ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Revenue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Payment collections over time</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {granularityOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setGranularity(opt.key)}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                granularity === opt.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 pr-6">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatRupee(v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0].value as number;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-elevated">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-600">₹{val.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
