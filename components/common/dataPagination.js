import React from 'react';
import { pageItems } from '../misc/Pagination';

const DataPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  // First, last and the pages around the current one (1 … 5 6 [7] 8 9 … 20).
  const pages = pageItems(currentPage, totalPages);

  return (
    <div className="data-pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        &lsaquo; Prev
      </button>
      {pages.map((page) =>
        typeof page === 'string' ? (
          <span key={page} className="page-gap" aria-hidden="true">…</span>
        ) : (
        <button
          key={page}
          className={page === currentPage ? 'active' : ''}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
        )
      )}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        Next &rsaquo;
      </button>
      <span className="page-info">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default DataPagination;
