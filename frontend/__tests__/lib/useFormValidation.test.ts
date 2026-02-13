import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '@/lib/useFormValidation';

describe('useFormValidation', () => {
  // ── Initialization ──

  describe('initialization', () => {
    it('initializes with empty values when no initialValues provided', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true }, email: { email: true } })
      );

      expect(result.current.fields.name.value).toBe('');
      expect(result.current.fields.email.value).toBe('');
    });

    it('initializes with provided initialValues', () => {
      const { result } = renderHook(() =>
        useFormValidation(
          { name: { required: true } },
          { name: 'Alice' }
        )
      );

      expect(result.current.fields.name.value).toBe('Alice');
    });

    it('marks required fields as invalid initially', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      expect(result.current.fields.name.isValid).toBe(false);
    });

    it('marks optional fields as valid initially', () => {
      const { result } = renderHook(() =>
        useFormValidation({ bio: { maxLength: { value: 200, message: 'Too long' } } })
      );

      expect(result.current.fields.bio.isValid).toBe(true);
    });

    it('starts untouched and not dirty', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      expect(result.current.fields.name.touched).toBe(false);
      expect(result.current.isDirty).toBe(false);
    });

    it('starts with no errors', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      expect(result.current.fields.name.error).toBeUndefined();
    });
  });

  // ── setValue ──

  describe('setValue', () => {
    it('updates the field value', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setValue('name', 'Bob'));

      expect(result.current.fields.name.value).toBe('Bob');
    });

    it('does not show error on untouched field', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setValue('name', ''));

      expect(result.current.fields.name.error).toBeUndefined();
    });

    it('shows error on touched field with invalid value', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));
      act(() => result.current.setValue('name', ''));

      expect(result.current.fields.name.error).toBe('This field is required');
    });

    it('updates isValid when value becomes valid', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      expect(result.current.fields.name.isValid).toBe(false);

      act(() => result.current.setValue('name', 'Alice'));

      expect(result.current.fields.name.isValid).toBe(true);
    });
  });

  // ── setTouched ──

  describe('setTouched', () => {
    it('marks the field as touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));

      expect(result.current.fields.name.touched).toBe(true);
    });

    it('triggers validation and shows error for invalid field', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));

      expect(result.current.fields.name.error).toBe('This field is required');
    });

    it('shows no error for valid field', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } }, { name: 'Alice' })
      );

      act(() => result.current.setTouched('name'));

      expect(result.current.fields.name.error).toBeUndefined();
    });
  });

  // ── setError ──

  describe('setError', () => {
    it('sets a custom error on the field', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: { email: true } })
      );

      act(() => result.current.setError('email', 'Email already taken'));

      expect(result.current.fields.email.error).toBe('Email already taken');
    });

    it('marks the field as touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: { email: true } })
      );

      act(() => result.current.setError('email', 'Server error'));

      expect(result.current.fields.email.touched).toBe(true);
    });

    it('marks field invalid when error is set', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: {} })
      );

      act(() => result.current.setError('email', 'Bad'));

      expect(result.current.fields.email.isValid).toBe(false);
    });

    it('marks field valid when error is cleared', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: {} })
      );

      act(() => result.current.setError('email', 'Bad'));
      act(() => result.current.setError('email', undefined));

      expect(result.current.fields.email.isValid).toBe(true);
    });
  });

  // ── Validation rules ──

  describe('validation rules', () => {
    it('required with boolean shows default message', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));

      expect(result.current.fields.name.error).toBe('This field is required');
    });

    it('required with string shows custom message', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: 'Name is needed' } })
      );

      act(() => result.current.setTouched('name'));

      expect(result.current.fields.name.error).toBe('Name is needed');
    });

    it('email with boolean shows default message', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: { email: true } })
      );

      act(() => result.current.setValue('email', 'bad'));
      act(() => result.current.setTouched('email'));

      expect(result.current.fields.email.error).toBe('Please enter a valid email address');
    });

    it('email with string shows custom message', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: { email: 'Invalid email format' } })
      );

      act(() => result.current.setValue('email', 'bad'));
      act(() => result.current.setTouched('email'));

      expect(result.current.fields.email.error).toBe('Invalid email format');
    });

    it('email passes for valid email', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: { email: true } })
      );

      act(() => result.current.setValue('email', 'test@example.com'));
      act(() => result.current.setTouched('email'));

      expect(result.current.fields.email.error).toBeUndefined();
    });

    it('minLength shows error when too short', () => {
      const { result } = renderHook(() =>
        useFormValidation({ pw: { minLength: { value: 8, message: 'Too short' } } })
      );

      act(() => result.current.setValue('pw', 'abc'));
      act(() => result.current.setTouched('pw'));

      expect(result.current.fields.pw.error).toBe('Too short');
    });

    it('maxLength shows error when too long', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { maxLength: { value: 5, message: 'Too long' } } })
      );

      act(() => result.current.setValue('name', 'abcdef'));
      act(() => result.current.setTouched('name'));

      expect(result.current.fields.name.error).toBe('Too long');
    });

    it('pattern shows error when no match', () => {
      const { result } = renderHook(() =>
        useFormValidation({ code: { pattern: { value: /^\d+$/, message: 'Numbers only' } } })
      );

      act(() => result.current.setValue('code', 'abc'));
      act(() => result.current.setTouched('code'));

      expect(result.current.fields.code.error).toBe('Numbers only');
    });

    it('pattern passes when value matches', () => {
      const { result } = renderHook(() =>
        useFormValidation({ code: { pattern: { value: /^\d+$/, message: 'Numbers only' } } })
      );

      act(() => result.current.setValue('code', '123'));
      act(() => result.current.setTouched('code'));

      expect(result.current.fields.code.error).toBeUndefined();
    });

    it('custom validation returns error string', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          pw: { custom: (v: string) => (v.includes(' ') ? 'No spaces' : undefined) },
        })
      );

      act(() => result.current.setValue('pw', 'has space'));
      act(() => result.current.setTouched('pw'));

      expect(result.current.fields.pw.error).toBe('No spaces');
    });

    it('custom validation returns undefined for valid value', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          pw: { custom: (v: string) => (v.includes(' ') ? 'No spaces' : undefined) },
        })
      );

      act(() => result.current.setValue('pw', 'nospaces'));
      act(() => result.current.setTouched('pw'));

      expect(result.current.fields.pw.error).toBeUndefined();
    });

    it('skips non-required validations for empty optional fields', () => {
      const { result } = renderHook(() =>
        useFormValidation({ email: { email: true } })
      );

      act(() => result.current.setTouched('email'));

      expect(result.current.fields.email.error).toBeUndefined();
    });
  });

  // ── validateAll ──

  describe('validateAll', () => {
    it('returns true when all fields are valid', () => {
      const { result } = renderHook(() =>
        useFormValidation(
          { name: { required: true }, email: { email: true } },
          { name: 'Alice' }
        )
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(true);
    });

    it('returns false when any field is invalid', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true }, bio: {} })
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid!).toBe(false);
    });

    it('marks all fields as touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true }, email: { email: true } })
      );

      act(() => result.current.validateAll());

      expect(result.current.fields.name.touched).toBe(true);
      expect(result.current.fields.email.touched).toBe(true);
    });

    it('populates errors on invalid fields', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.validateAll());

      expect(result.current.fields.name.error).toBe('This field is required');
    });
  });

  // ── reset ──

  describe('reset', () => {
    it('clears values back to initial state', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setValue('name', 'Alice'));
      act(() => result.current.reset());

      expect(result.current.fields.name.value).toBe('');
    });

    it('clears errors', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.validateAll());
      act(() => result.current.reset());

      expect(result.current.fields.name.error).toBeUndefined();
    });

    it('clears touched state', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));
      act(() => result.current.reset());

      expect(result.current.fields.name.touched).toBe(false);
    });

    it('resets isDirty to false', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));
      expect(result.current.isDirty).toBe(true);

      act(() => result.current.reset());
      expect(result.current.isDirty).toBe(false);
    });
  });

  // ── getValues ──

  describe('getValues', () => {
    it('returns current field values', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true }, email: { email: true } })
      );

      act(() => {
        result.current.setValue('name', 'Alice');
        result.current.setValue('email', 'alice@test.com');
      });

      const values = result.current.getValues();
      expect(values.name).toBe('Alice');
      expect(values.email).toBe('alice@test.com');
    });
  });

  // ── Form-wide state ──

  describe('form-wide state', () => {
    it('isValid is true when all fields are valid', () => {
      const { result } = renderHook(() =>
        useFormValidation(
          { name: { required: true }, bio: {} },
          { name: 'Alice' }
        )
      );

      // initialValues don't trigger validation — setValue does
      act(() => result.current.setValue('name', 'Alice'));

      expect(result.current.isValid).toBe(true);
    });

    it('isValid is false when any field is invalid', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true }, bio: {} })
      );

      expect(result.current.isValid).toBe(false);
    });

    it('isDirty becomes true after any field is touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({ name: { required: true } })
      );

      act(() => result.current.setTouched('name'));

      expect(result.current.isDirty).toBe(true);
    });
  });
});
