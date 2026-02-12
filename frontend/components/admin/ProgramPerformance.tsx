'use client';

import Link from 'next/link';
import { Trophy, BarChart3 } from 'lucide-react';
import { ProgramPerformanceItem } from '@/types/admin';

interface ProgramPerformanceProps {
  programs: ProgramPerformanceItem[];
  overallCompletionRate: number;
}

function CompletionRing({ percentage, size = 40 }: { percentage: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#195E72"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-700">{percentage}%</span>
    </div>
  );
}

export default function ProgramPerformance({ programs, overallCompletionRate }: ProgramPerformanceProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Program Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Top programs by enrollment</p>
        </div>
        <CompletionRing percentage={overallCompletionRate} />
      </div>

      <div className="p-4">
        {programs.length > 0 ? (
          <div className="space-y-3.5">
            {programs.map((program, index) => (
              <Link
                key={program.id}
                href={`/admin/programs/${program.id}`}
                className="block group"
              >
                <div className="flex items-center gap-3">
                  {index === 0 ? (
                    <div className="w-7 h-7 rounded-full bg-gold-50 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-3.5 h-3.5 text-gold-500" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                        {program.name}
                      </p>
                      <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                        {program.enrollmentCount} enrolled
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${program.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-9 text-right">
                        {program.completionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium text-sm mb-1">No program data yet</p>
            <p className="text-xs text-slate-400">Enroll learners to see performance</p>
          </div>
        )}
      </div>
    </div>
  );
}
