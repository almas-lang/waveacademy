'use client';

import { useState, useCallback } from 'react';

export interface ValidationRules {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  email?: boolean | string;
  custom?: (value: string) => string | undefined;
}

export interface FieldState {
  value: string;
  error: string | undefined;
  touched: boolean;
  isValid: boolean;
}

export interface FormState<T extends Record<string, ValidationRules>> {
  fields: { [K in keyof T]: FieldState };
  isValid: boolean;
  isDirty: boolean;
}

export function useFormValidation<T extends Record<string, ValidationRules>>(
  rules: T,
  initialValues?: Partial<{ [K in keyof T]: string }>
) {
  const initializeFields = () => {
    const fields: Record<string, FieldState> = {};
    for (const key of Object.keys(rules)) {
      fields[key] = {
        value: initialValues?.[key] || '',
        error: undefined,
        touched: false,
        isValid: !rules[key].required,
      };
    }
    return fields as { [K in keyof T]: FieldState };
  };

  const [fields, setFields] = useState<{ [K in keyof T]: FieldState }>(initializeFields);

  const validateField = useCallback((name: keyof T, value: string): string | undefined => {
    const fieldRules = rules[name];
    if (!fieldRules) return undefined;

    // Required check
    if (fieldRules.required && !value.trim()) {
      return typeof fieldRules.required === 'string'
        ? fieldRules.required
        : 'This field is required';
    }

    // Skip other validations if empty and not required
    if (!value.trim()) return undefined;

    // Email validation
    if (fieldRules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return typeof fieldRules.email === 'string'
          ? fieldRules.email
          : 'Please enter a valid email address';
      }
    }

    // Min length
    if (fieldRules.minLength && value.length < fieldRules.minLength.value) {
      return fieldRules.minLength.message;
    }

    // Max length
    if (fieldRules.maxLength && value.length > fieldRules.maxLength.value) {
      return fieldRules.maxLength.message;
    }

    // Pattern
    if (fieldRules.pattern && !fieldRules.pattern.value.test(value)) {
      return fieldRules.pattern.message;
    }

    // Custom validation
    if (fieldRules.custom) {
      return fieldRules.custom(value);
    }

    return undefined;
  }, [rules]);

  const setValue = useCallback((name: keyof T, value: string) => {
    setFields((prev) => {
      const error = prev[name].touched ? validateField(name, value) : undefined;
      return {
        ...prev,
        [name]: {
          ...prev[name],
          value,
          error,
          isValid: !validateField(name, value),
        },
      };
    });
  }, [validateField]);

  const setTouched = useCallback((name: keyof T) => {
    setFields((prev) => {
      const error = validateField(name, prev[name].value);
      return {
        ...prev,
        [name]: {
          ...prev[name],
          touched: true,
          error,
          isValid: !error,
        },
      };
    });
  }, [validateField]);

  const setError = useCallback((name: keyof T, error: string | undefined) => {
    setFields((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        error,
        touched: true,
        isValid: !error,
      },
    }));
  }, []);

  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newFields = { ...fields };

    for (const name of Object.keys(rules) as (keyof T)[]) {
      const error = validateField(name, fields[name].value);
      newFields[name] = {
        ...newFields[name],
        touched: true,
        error,
        isValid: !error,
      };
      if (error) isValid = false;
    }

    setFields(newFields);
    return isValid;
  }, [fields, rules, validateField]);

  const reset = useCallback(() => {
    setFields(initializeFields());
  }, []);

  const getValues = useCallback(() => {
    const values: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      values[key] = fields[key as keyof T].value;
    }
    return values as { [K in keyof T]: string };
  }, [fields]);

  const isFormValid = Object.values(fields).every((field) => field.isValid);
  const isDirty = Object.values(fields).some((field) => field.touched);

  return {
    fields,
    setValue,
    setTouched,
    setError,
    validateField,
    validateAll,
    reset,
    getValues,
    isValid: isFormValid,
    isDirty,
  };
}
