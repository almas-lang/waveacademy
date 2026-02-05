'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-all duration-150 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
    );

    const variants = {
      primary: clsx(
        'bg-accent-500 text-white shadow-sm',
        'hover:bg-accent-600 hover:shadow-md',
        'active:bg-accent-700 active:shadow-sm',
        'focus:ring-red-300'
      ),
      secondary: clsx(
        'bg-primary-800 text-white shadow-sm',
        'hover:bg-primary-700 hover:shadow-md',
        'active:bg-primary-900 active:shadow-sm',
        'focus:ring-slate-400'
      ),
      outline: clsx(
        'border border-slate-300 bg-white text-slate-700',
        'hover:bg-slate-50 hover:border-slate-400',
        'active:bg-slate-100',
        'focus:ring-slate-300'
      ),
      danger: clsx(
        'bg-red-600 text-white shadow-sm',
        'hover:bg-red-700 hover:shadow-md',
        'active:bg-red-800 active:shadow-sm',
        'focus:ring-red-300'
      ),
      ghost: clsx(
        'bg-transparent text-slate-600',
        'hover:bg-slate-100 hover:text-slate-900',
        'active:bg-slate-200',
        'focus:ring-slate-300'
      ),
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
