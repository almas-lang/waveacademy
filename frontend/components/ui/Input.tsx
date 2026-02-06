'use client';

import { forwardRef, InputHTMLAttributes, ReactNode, useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showSuccessState?: boolean;
  isValid?: boolean;
  validateOnBlur?: boolean;
  onValidate?: (value: string) => string | undefined;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    showSuccessState = false,
    isValid,
    validateOnBlur = false,
    onValidate,
    className,
    id,
    onBlur,
    onChange,
    ...props
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [localError, setLocalError] = useState<string | undefined>(error);
    const [touched, setTouched] = useState(false);
    const [shake, setShake] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Sync external error
    useEffect(() => {
      if (error) {
        setLocalError(error);
        setShake(true);
        const timer = setTimeout(() => setShake(false), 500);
        return () => clearTimeout(timer);
      } else {
        setLocalError(undefined);
      }
    }, [error]);

    // Update success state
    useEffect(() => {
      if (showSuccessState && isValid && touched && !localError) {
        setShowSuccess(true);
      } else {
        setShowSuccess(false);
      }
    }, [showSuccessState, isValid, touched, localError]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (validateOnBlur && onValidate) {
        const validationError = onValidate(e.target.value);
        setLocalError(validationError);
        if (validationError) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
      }
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear error on change if user is typing
      if (localError && touched) {
        if (onValidate) {
          const validationError = onValidate(e.target.value);
          setLocalError(validationError);
        } else {
          setLocalError(undefined);
        }
      }
      onChange?.(e);
    };

    const hasError = !!localError;
    const displayError = touched ? localError : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className={clsx('relative', shake && 'animate-shake')}>
          {leftIcon && (
            <div className={clsx(
              'absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-150',
              hasError ? 'text-red-400' : 'text-slate-400'
            )}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full px-3.5 py-2.5 text-sm rounded-lg',
              'border bg-white text-carbon',
              'placeholder:text-slate-400',
              'transition-all duration-150',
              'hover:border-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              leftIcon && 'pl-10',
              (rightIcon || showSuccess || hasError) && 'pr-10',
              hasError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 animate-error-pulse'
                : showSuccess
                  ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20'
                  : 'border-slate-300 focus:border-slate-500 focus:ring-slate-500/10',
              className
            )}
            onBlur={handleBlur}
            onChange={handleChange}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {/* Right side icon - error, success, or custom */}
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            {hasError ? (
              <AlertCircle className="w-4 h-4 text-red-500 animate-fade-in" />
            ) : showSuccess ? (
              <div className="w-4 h-4 text-green-500 animate-pulse-once">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" className="animate-check-draw" style={{ strokeDasharray: 24, strokeDashoffset: 0 }} />
                </svg>
              </div>
            ) : rightIcon ? (
              <div className="text-slate-400">{rightIcon}</div>
            ) : null}
          </div>
        </div>
        {/* Error message with animation */}
        {displayError && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 animate-slide-down flex items-center gap-1.5"
            role="alert"
          >
            {displayError}
          </p>
        )}
        {helperText && !displayError && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
