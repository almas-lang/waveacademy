'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  icon: ReactNode;
  iconColor?: 'teal' | 'coral' | 'blue' | 'purple' | 'slate';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  trendLabel?: string;
  description?: string;
  href?: string;
  className?: string;
  animationDelay?: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 800;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

const iconColorClasses = {
  teal: 'bg-primary-50 text-primary-500',
  coral: 'bg-accent-50 text-accent-500',
  blue: 'bg-blue-50 text-blue-500',
  purple: 'bg-purple-50 text-purple-500',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatsCard({
  title,
  value,
  prefix,
  icon,
  iconColor = 'slate',
  trend,
  trendLabel,
  description,
  href,
  className,
  animationDelay = 0,
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
              {prefix}{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
            </p>
          </div>
          <div
            className={clsx(
              'p-3 rounded-xl transition-colors',
              iconColorClasses[iconColor],
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
            <span className="text-xs text-slate-500">{trendLabel || 'vs last period'}</span>
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
    </>
  );

  const cardClasses = clsx(
    'relative overflow-hidden rounded-xl border p-5',
    'bg-white border-slate-200/80 shadow-soft',
    'transition-all duration-200',
    'animate-slide-up opacity-0 [animation-fill-mode:forwards]',
    href
      ? 'cursor-pointer hover:shadow-elevated hover:border-slate-300/80 group'
      : 'hover:shadow-elevated hover:border-slate-300/80',
    className
  );

  const style = animationDelay > 0 ? { animationDelay: `${animationDelay}ms` } : undefined;

  if (href) {
    return (
      <Link href={href} className={cardClasses} style={style}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={cardClasses} style={style}>
      {cardContent}
    </div>
  );
}
