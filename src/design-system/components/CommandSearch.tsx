import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, FileText, Award, DollarSign, ArrowRight } from 'lucide-react';
import './CommandSearch.css';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Sites' | 'Purchase Orders' | 'Certificates' | 'Invoices' | 'Navigation';
  path: string;
}

export interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandSearch({ isOpen, onClose }: CommandSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Navigation shortcuts available in foundation
  const defaultShortcuts: SearchResultItem[] = [
    { id: 'nav-explorer', title: 'Commercial Explorer', subtitle: 'Search sites, POs, and commercial relationships', category: 'Navigation', path: '/explorer' },
    { id: 'nav-packages', title: 'Commercial Packages', subtitle: 'Ingest and inspect approved BOQs and POs', category: 'Navigation', path: '/commercial-packages' },
    { id: 'nav-certs', title: 'Certificates (FAC / PAC / DPC)', subtitle: 'Author and review commercial site acceptance certificates', category: 'Navigation', path: '/certificates' },
    { id: 'nav-invoices', title: 'Invoices & SCM Review', subtitle: 'Inspect supplier claims and review queues', category: 'Navigation', path: '/invoices' },
    { id: 'nav-finance', title: 'Finance & Payment Ledger', subtitle: 'Process invoices, disbursements, and aging', category: 'Navigation', path: '/finance' },
  ];

  const filteredResults = query.trim()
    ? defaultShortcuts.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : defaultShortcuts;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        navigate(filteredResults[selectedIndex].path);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredResults, selectedIndex, navigate]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Sites':
        return <MapPin size={14} />;
      case 'Purchase Orders':
        return <FileText size={14} />;
      case 'Certificates':
        return <Award size={14} />;
      case 'Invoices':
        return <DollarSign size={14} />;
      default:
        return <ArrowRight size={14} />;
    }
  };

  return (
    <div className="clms-command-backdrop" onClick={onClose}>
      <div
        className="clms-command-dialog border-hairline"
        role="dialog"
        aria-modal="true"
        aria-label="Commercial Search & Commands"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clms-command__input-bar border-hairline">
          <Search size={18} className="clms-command__search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="clms-command__input"
            placeholder="Search sites, POs, certificates, invoices, or navigate..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            type="button"
            className="clms-command__close"
            onClick={onClose}
            aria-label="Close command search"
          >
            <X size={16} />
          </button>
        </div>

        <div className="clms-command__results">
          {filteredResults.length === 0 ? (
            <div className="clms-command__empty">
              <p>No commercial records or commands matching "{query}"</p>
              <span>Operational search results will populate as commercial packages are ingested.</span>
            </div>
          ) : (
            <div className="clms-command__group">
              <div className="clms-command__group-title">Navigation & Workspaces</div>
              <ul className="clms-command__list" role="listbox">
                {filteredResults.map((item, idx) => (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    className={`clms-command__item ${idx === selectedIndex ? 'clms-command__item--selected' : ''}`}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="clms-command__item-icon">{getCategoryIcon(item.category)}</div>
                    <div className="clms-command__item-content">
                      <span className="clms-command__item-title">{item.title}</span>
                      <span className="clms-command__item-subtitle">{item.subtitle}</span>
                    </div>
                    <kbd className="clms-command__item-kbd">↵</kbd>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="clms-command__footer border-hairline">
          <div className="clms-command__shortcuts">
            <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
          <span className="clms-command__hint">CLMS Discovery Engine</span>
        </footer>
      </div>
    </div>
  );
}
