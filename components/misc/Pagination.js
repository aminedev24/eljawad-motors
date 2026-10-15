import React from "react";

// Page numbers with gaps: always the first and last page, plus `siblings`
// pages either side of the current one, e.g. 1 … 5 6 [7] 8 9 … 5,333.
export const pageItems = (current, total, siblings = 2) => {
  const items = [];
  let start = Math.max(2, current - siblings);
  let end = Math.min(total - 1, current + siblings);
  // A gap that would hide a single page shows that page instead.
  if (start === 3) start = 2;
  if (end === total - 2) end = total - 1;
  items.push(1);
  if (start > 2) items.push("gap-start");
  for (let n = start; n <= end; n++) items.push(n);
  if (end < total - 1) items.push("gap-end");
  if (total > 1) items.push(total);
  return items;
};

const fmt = (n) => n.toLocaleString("en-US");

const navButton =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-navy hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-40";

const Pagination = ({ currentPage, totalPages, totalItems, perPage, onPageChange, itemLabel = "vehicles" }) => {
  if (totalPages <= 1) return null;
  const first = (currentPage - 1) * perPage + 1;
  const last = Math.min(currentPage * perPage, totalItems);

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-col items-center gap-3">
      {/* Phones: just previous / position / next */}
      <div className="flex items-center gap-3 sm:hidden">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={navButton} aria-label="Previous page">
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {fmt(currentPage)} / {fmt(totalPages)}
        </span>
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={navButton} aria-label="Next page">
          ›
        </button>
      </div>

      {/* Tablet and up: numbered pages with gaps */}
      <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={navButton}>
          ‹ Prev
        </button>
        {pageItems(currentPage, totalPages).map((item) =>
          typeof item === "string" ? (
            <span key={item} className="px-1 text-sm text-gray-400" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={currentPage === item ? "page" : undefined}
              aria-label={`Page ${item}`}
              className={`min-w-[2.5rem] rounded-md border px-3 py-2 text-sm font-semibold transition ${
                currentPage === item
                  ? "border-brand-charcoal bg-brand-charcoal text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-brand-navy hover:text-brand-navy"
              }`}
            >
              {fmt(item)}
            </button>
          )
        )}
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={navButton}>
          Next ›
        </button>
      </div>

      <span className="text-xs text-gray-500">
        Showing {fmt(first)}–{fmt(last)} of {fmt(totalItems)} {itemLabel}
      </span>
    </nav>
  );
};

export default Pagination;
