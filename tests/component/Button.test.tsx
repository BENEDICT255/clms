import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/design-system';

describe('Button Component', () => {
  it('renders label and applies primary variant class', () => {
    render(<Button variant="primary">Confirm Package</Button>);
    const button = screen.getByRole('button', { name: /confirm package/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('clms-button--primary');
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button and displays loading spinner when isLoading is true', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save Changes
      </Button>
    );
    const button = screen.getByRole('button', { name: /save changes/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
