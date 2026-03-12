'use client';
import { clsx } from 'clsx';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'w-full bg-[var(--navy)] border rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
            error ? 'border-[var(--error)]' : 'border-[var(--border)]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--error)]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
