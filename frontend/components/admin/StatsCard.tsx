'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  variant?: 'default' | 'accent';
  href?: string;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  description,
  variant = 'default',
  href,
  className,
}: StatsCardProps) {
  const cardContent = (
    <>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          <div
            className={clsx(
              'p-3 rounded-xl transition-colors',
              variant === 'accent'
                ? 'bg-accent-50 text-accent-500'
                : 'bg-slate-100 text-slate-600',
              href && 'group-hover:bg-slate-900 group-hover:text-white'
            )}
          >
            {icon}
          </div>
        </div>

        {/* Trend or Description */}
        {trend && (
          <div className="flex items-center gap-1.5">
            <div
              className={clsx(
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium',
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <span className="text-xs text-slate-500">vs last month</span>
          </div>
        )}

        {description && !trend && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{description}</p>
            {href && (
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
      </div>

      {/* Decorative accent line for accent variant */}
      {variant === 'accent' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-500 to-accent-400" />
      )}
    </>
  );

  const cardClasses = clsx(
    'relative overflow-hidden rounded-xl border p-5',
    'bg-white border-slate-200/80 shadow-soft',
    'transition-all duration-200',
    href
      ? 'cursor-pointer hover:shadow-elevated hover:border-slate-300/80 group'
      : 'hover:shadow-elevated hover:border-slate-300/80',
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={cardClasses}>
      {cardContent}
    </div>
  );
}
