'use client';

import Link from 'next/link';
import { Trophy, BarChart3 } from 'lucide-react';
import { ProgramPerformanceItem } from '@/types/admin';

interface ProgramPerformanceProps {
  programs: ProgramPerformanceItem[];
  overallCompletionRate: number;
}

export default function ProgramPerformance({ programs, overallCompletionRate }: ProgramPerformanceProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Program Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Top programs by enrollment</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700">
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{overallCompletionRate}% overall</span>
        </div>
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
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
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
