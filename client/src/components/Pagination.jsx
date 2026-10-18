import { ChevronLeft, ChevronRight } from 'lucide-react';

/** @param {{ page: number, pages: number, total: number, onPage: (n: number) => void, noun?: string }} props */
export default function Pagination({ page, pages, total, onPage, noun = 'records' }) {
  if (!total) return null;
  return (
    <div className="pagination">
      <span>
        {total} {noun}, page {page} of {pages}
      </span>
      <div className="pagination__buttons">
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} />
          Previous
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}