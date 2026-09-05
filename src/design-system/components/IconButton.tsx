import React, { forwardRef } from 'react';
import './IconButton.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: 'secondary' | 'tertiary';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, variant = 'tertiary', size = 'md', className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`clms-icon-button clms-icon-button--${variant} clms-icon-button--${size} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
