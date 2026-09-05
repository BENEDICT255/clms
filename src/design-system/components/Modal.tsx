import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = '540px',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="clms-modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="clms-modal border-hairline"
        style={{ width, maxWidth: '92vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="clms-modal__header border-hairline">
          <h2 id="modal-title" className="clms-modal__title">
            {title}
          </h2>
          <IconButton aria-label="Close modal" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="clms-modal__body">{children}</div>
        {footer && <footer className="clms-modal__footer border-hairline">{footer}</footer>}
      </div>
    </div>
  );
}
