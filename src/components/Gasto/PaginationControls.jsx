import { useMemo } from "react";

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function getPageRange(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= 1) return [1];

  const pages = [];
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, currentPage + half);

  if (currentPage - half <= 1) end = Math.min(totalPages, maxVisible);
  if (currentPage + half >= totalPages) start = Math.max(1, totalPages - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (pages[0] > 1) {
    pages.unshift(1);
    if (pages[1] > 2) pages.splice(1, 0, "...");
  }
  if (pages[pages.length - 1] < totalPages) {
    if (pages[pages.length - 1] < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }

  return pages;
}

const btnBase = "shrink-0 inline-flex items-center justify-center rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
const btnIdle = "h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700";
const btnActive = "h-8 min-w-8 px-2 bg-blue-600 text-white shadow-sm";
const btnDisabled = "opacity-35 pointer-events-none";

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 0,
  currentFrom = 0,
  currentTo = 0,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 50, 100, 200],
  showJumpTo = false,
}) {
  const pageNumbers = useMemo(
    () => getPageRange(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (totalPages <= 1 && typeof onPageSizeChange !== "function") return null;

  const handlePrev = () => { if (currentPage > 1) onPageChange(currentPage - 1); };
  const handleNext = () => { if (currentPage < totalPages) onPageChange(currentPage + 1); };

  const handleJump = (e) => {
    const page = parseInt(e.target.value, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) onPageChange(page);
    e.target.value = "";
  };

  const handlePageSizeChange = (e) => {
    const next = parseInt(e.target.value, 10);
    if (!Number.isNaN(next) && next > 0 && typeof onPageSizeChange === "function") {
      onPageSizeChange(next);
    }
  };

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 px-1 py-1.5">

      {/* Contador */}
      <p className="shrink-0 text-xs text-slate-400 tabular-nums">
        {currentFrom}–{currentTo} <span className="text-slate-300">de</span> {totalItems}
      </p>

      {/* Botones de página */}
      <div className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`${btnBase} ${btnIdle} ${currentPage === 1 ? btnDisabled : ""}`}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </button>

        {pageNumbers.map((item, idx) =>
          item === "..." ? (
            <span key={`ellipsis-${idx}`} className="shrink-0 inline-flex h-8 w-6 items-center justify-center text-sm font-medium text-slate-400 select-none">…</span>
          ) : (
            <button
              key={`page-${item}`}
              onClick={() => onPageChange(item)}
              className={`${btnBase} ${item === currentPage ? btnActive : btnIdle}`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`${btnBase} ${btnIdle} ${currentPage === totalPages ? btnDisabled : ""}`}
          aria-label="Página siguiente"
        >
          <ChevronRight />
        </button>

        {showJumpTo && (
          <input
            type="number"
            min={1}
            max={totalPages}
            placeholder="#"
            onKeyDown={(e) => e.key === "Enter" && handleJump(e)}
            onBlur={handleJump}
            className="ml-1 w-12 shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
      </div>

      {/* Tamaño de página */}
      {typeof onPageSizeChange === "function" && (
        <div className="shrink-0 flex items-center gap-1">
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-lg bg-slate-100 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">/ pág</span>
        </div>
      )}
    </nav>
  );
}
