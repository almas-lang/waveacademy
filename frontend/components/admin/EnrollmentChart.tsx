'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EnrollmentChartPoint } from '@/types/admin';

interface EnrollmentChartProps {
  data: EnrollmentChartPoint[];
}

export default function EnrollmentChart({ data }: EnrollmentChartProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
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
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ fontWeight: 600, color: '#0f172a' }}
            />
            <Area
              type="monotone"
              dataKey="enrollments"
              stroke="#195E72"
              strokeWidth={2}
              fill="url(#enrollmentGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
