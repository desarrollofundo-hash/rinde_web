import { useMemo } from "react";

/**
 * Genera un array de páginas a mostrar, incluyendo números y "..." cuando sea necesario.
 * Ejemplo: [1, "...", 5, 6, 7, "...", 20]
 */
function getPageRange(currentPage, totalPages, maxVisible = 5) {
    if (totalPages <= 1) return [1];

    const pages = [];
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    // Ajustar cuando el rango está cerca del inicio o del final
    if (currentPage - half <= 1) {
        end = Math.min(totalPages, maxVisible);
    }
    if (currentPage + half >= totalPages) {
        start = Math.max(1, totalPages - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    // Agregar primera página y elipsis si es necesario
    if (pages[0] > 1) {
        pages.unshift(1);
        if (pages[1] > 2) pages.splice(1, 0, "...");
    }

    // Agregar última página y elipsis si es necesario
    if (pages[pages.length - 1] < totalPages) {
        if (pages[pages.length - 1] < totalPages - 1) pages.push("...");
        pages.push(totalPages);
    }

    return pages;
}

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
    showJumpTo = false, // nueva prop opcional
}) {
    const pageNumbers = useMemo(
        () => getPageRange(currentPage, totalPages),
        [currentPage, totalPages]
    );

    // Evitar errores cuando no hay páginas
    if (totalPages <= 1 && typeof onPageSizeChange !== "function") return null;

    const handlePrev = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    const handleJump = (e) => {
        const page = parseInt(e.target.value, 10);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
        e.target.value = ""; // limpiar input
    };

    const handlePageSizeChange = (e) => {
        const next = parseInt(e.target.value, 10);
        if (!Number.isNaN(next) && next > 0 && typeof onPageSizeChange === "function") {
            onPageSizeChange(next);
        }
    };

    return (
        <nav
            aria-label="Paginación"
            className="mt-2 rounded-xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm sm:px-4 sm:py-3"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Info */}
                {/*  <div>
                    <p className="text-xs text-slate-500">
                        Página <span className="font-semibold text-blue-600">{currentPage}</span> de {totalPages}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        {currentFrom}-{currentTo} de {totalItems}
                    </p>
                </div> */}

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {/* Prev */}
                    <button
                        onClick={handlePrev}
                        disabled={currentPage === 1}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                        ←
                    </button>

                    {/* Pages */}
                    <div className="flex items-center gap-1">
                        {pageNumbers.map((item, idx) => {
                            if (item === "...") {
                                return (
                                    <span key={idx} className="px-2 text-slate-400 text-sm">
                                        …
                                    </span>
                                );
                            }

                            const isCurrent = item === currentPage;

                            return (
                                <button
                                    key={item}
                                    onClick={() => onPageChange(item)}
                                    className={`
                                    px-3 py-1.5 text-sm rounded-md transition
                                    ${isCurrent
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-slate-600 hover:bg-slate-100"}
                                `}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {/* Next */}
                    <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                        →
                    </button>

                    {/* Jump */}
                    {showJumpTo && (
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            placeholder="#"
                            onKeyDown={(e) => e.key === "Enter" && handleJump(e)}
                            onBlur={handleJump}
                            className="w-14 rounded-md bg-slate-100 px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    )}

                    {/* Page size */}
                    {typeof onPageSizeChange === "function" && (
                        <select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            {pageSizeOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
        </nav>
    );
}