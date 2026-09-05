import React, { forwardRef } from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ isError = false, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className={`clms-input-wrapper ${isError ? 'clms-input-wrapper--error' : ''}`}>
        {leftIcon && <span className="clms-input__icon clms-input__icon--left">{leftIcon}</span>}
        <input
          ref={ref}
          className={`clms-input ${leftIcon ? 'clms-input--with-left-icon' : ''} ${rightIcon ? 'clms-input--with-right-icon' : ''} ${className}`}
          aria-invalid={isError ? 'true' : undefined}
          {...props}
        />
        {rightIcon && <span className="clms-input__icon clms-input__icon--right">{rightIcon}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface FieldProps {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, id, error, hint, required = false, children, className = '' }: FieldProps) {
  return (
    <div className={`clms-field ${className}`}>
      <label htmlFor={id} className="clms-field__label">
        {label}
        {required && <span className="clms-field__required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <span className="clms-field__hint">{hint}</span>}
      {error && (
        <span id={`${id}-error`} className="clms-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
