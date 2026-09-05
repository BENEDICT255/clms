import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import './DataTable.css';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current filter criteria.',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={`clms-table-container border-hairline ${className}`}>
        <table className="clms-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width, textAlign: col.align || 'left' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx}>
                {columns.map((_, cIdx) => (
                  <td key={cIdx}>
                    <Skeleton height={16} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`clms-table-container border-hairline ${className}`}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`clms-table-container border-hairline ${className}`}>
      <table className="clms-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                style={{ width: col.width, textAlign: col.align || 'left' }}
                className={col.align === 'right' ? 'clms-table__th--right' : ''}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => {
            const rowKey = 'id' in row && (row as { id: unknown }).id != null
              ? String((row as { id: unknown }).id)
              : rIdx;

            return (
              <tr
                key={rowKey}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'clms-table__tr--clickable' : ''}
              >
                {columns.map((col, cIdx) => {
                  const value = col.cell
                    ? col.cell(row)
                    : col.accessorKey
                    ? (row[col.accessorKey] as ReactNode)
                    : null;

                  return (
                    <td
                      key={cIdx}
                      style={{ textAlign: col.align || 'left' }}
                      className={col.align === 'right' ? 'tabular-nums' : ''}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
