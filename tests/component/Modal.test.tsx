import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '@/design-system';

describe('Modal Component', () => {
  it('renders modal content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Confirm Certificate">
        <p>Are you sure you want to approve this certificate?</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Certificate')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to approve this certificate?')
    ).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Confirm Certificate">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Dialog Title">
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
