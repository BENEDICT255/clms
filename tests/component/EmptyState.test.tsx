import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '@/design-system';

describe('EmptyState Component', () => {
  it('renders title and descriptive text', () => {
    render(
      <EmptyState
        title="No records yet"
        description="Your commercial records will show up once ingested."
      />
    );

    expect(screen.getByText('No records yet')).toBeInTheDocument();
    expect(
      screen.getByText('Your commercial records will show up once ingested.')
    ).toBeInTheDocument();
  });

  it('renders action button and triggers onAction callback when provided', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        actionLabel="Create First Record"
        onAction={handleAction}
      />
    );

    const button = screen.getByRole('button', { name: /create first record/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
