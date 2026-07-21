import type { ReactElement } from 'react';
import './Pagination.css';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps): ReactElement | null {
  if (totalCount <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <i className="icon icon-chevron-left" aria-hidden="true" />
      </button>
      <span className="pagination-info">
        Page <strong>{page}</strong> of {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <i className="icon icon-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
