import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Drawer.css';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '480px',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      drawerRef.current?.focus();
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
    <div className="clms-drawer-backdrop" onClick={onClose}>
      <div
        ref={drawerRef}
        className="clms-drawer"
        style={{ width, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="clms-drawer__header border-hairline">
          <div>
            <h2 id="drawer-title" className="clms-drawer__title">
              {title}
            </h2>
            {subtitle && <p className="clms-drawer__subtitle">{subtitle}</p>}
          </div>
          <IconButton aria-label="Close drawer" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="clms-drawer__body">{children}</div>
        {footer && <footer className="clms-drawer__footer border-hairline">{footer}</footer>}
      </div>
    </div>
  );
}
