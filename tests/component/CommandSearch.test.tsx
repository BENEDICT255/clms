import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { CommandSearch } from '@/design-system';

describe('CommandSearch Component', () => {
  it('renders search input and shortcut list when open', () => {
    render(
      <BrowserRouter>
        <CommandSearch isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/search sites, pos, certificates/i)).toBeInTheDocument();
    expect(screen.getByText('Commercial Explorer')).toBeInTheDocument();
    expect(screen.getByText('Commercial Packages')).toBeInTheDocument();
  });

  it('filters results based on user query', () => {
    render(
      <BrowserRouter>
        <CommandSearch isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/search sites, pos, certificates/i);
    fireEvent.change(input, { target: { value: 'Finance' } });

    expect(screen.getByText('Finance & Payment Ledger')).toBeInTheDocument();
    expect(screen.queryByText('Commercial Packages')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <BrowserRouter>
        <CommandSearch isOpen={true} onClose={handleClose} />
      </BrowserRouter>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
