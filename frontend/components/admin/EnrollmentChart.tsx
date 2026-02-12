'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EnrollmentChartPoint } from '@/types/admin';

interface EnrollmentChartProps {
  data: EnrollmentChartPoint[];
}

export default function EnrollmentChart({ data }: EnrollmentChartProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Enrollment Trends</h2>
        <p className="text-xs text-slate-500 mt-0.5">New enrollments per month</p>
      </div>
      <div className="p-4 pr-6">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#195E72" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#195E72" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-elevated">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-primary-500" />
                      <span className="text-sm text-slate-600">{payload[0].value} enrollments</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="enrollments"
              stroke="#195E72"
              strokeWidth={2}
              fill="url(#enrollmentGradient)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
