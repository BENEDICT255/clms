import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './IconButton';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  className = '',
}: PaginationProps) {
  const startItem = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className={`clms-pagination ${className}`}>
      <span className="clms-pagination__info tabular-nums">
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{' '}
        <strong>{totalRecords}</strong> records
      </span>
      <div className="clms-pagination__controls">
        <IconButton
          aria-label="Previous page"
          size="sm"
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={14} />
        </IconButton>
        <span className="clms-pagination__page-indicator tabular-nums">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <IconButton
          aria-label="Next page"
          size="sm"
          variant="secondary"
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={14} />
        </IconButton>
      </div>
    </div>
  );
}
