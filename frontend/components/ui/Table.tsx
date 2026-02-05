'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: {
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  onRowClick?: (item: T) => void;
  rowKey: (item: T) => string;
  className?: string;
}

export default function Table<T>({
  columns,
  data,
  isLoading,
  emptyState,
  onRowClick,
  rowKey,
  className,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <div className={clsx(className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(
                  'px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider',
                  'bg-slate-50/50',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, index) => (
            <tr
              key={rowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                'transition-colors duration-100',
                onRowClick && 'cursor-pointer hover:bg-slate-50/80'
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx('px-5 py-4 text-slate-700', column.className)}
                >
                  {column.render
                    ? column.render(item)
                    : (item as Record<string, unknown>)[column.key]?.toString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
