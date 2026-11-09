import clsx from 'clsx';
import { forwardRef, type InputHTMLAttributes, useId } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

/** Campo de texto com label, dica e mensagem de erro acessíveis. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          'min-h-11 rounded-xl border bg-white px-3 text-base text-stone-900 placeholder:text-stone-400',
          'focus:outline-2 focus:outline-offset-0 focus:outline-brand-600',
          error ? 'border-rose-400' : 'border-stone-300',
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-rose-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-sm text-stone-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
});
