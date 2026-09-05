import React, { forwardRef } from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      icon,
      iconPosition = 'left',
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`clms-button clms-button--${variant} clms-button--${size} ${className}`}
        {...props}
      >
        {isLoading && <span className="clms-button__spinner" aria-hidden="true" />}
        {!isLoading && icon && iconPosition === 'left' && (
          <span className="clms-button__icon">{icon}</span>
        )}
        <span className="clms-button__label">{children}</span>
        {!isLoading && icon && iconPosition === 'right' && (
          <span className="clms-button__icon">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
