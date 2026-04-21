import { useState } from "react";
import {
    getWorkflowStatusBadgeClass,
    getWorkflowStatusLabel,
    resolveWorkflowStatus,
} from "../shared/workflowStatus";
import { IconEye } from "../../Icons/preview";
import PaginationControls from "../Gasto/PaginationControls";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_STORAGE_KEY = "revision.pageSize";
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const firstDefined = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }
    return "";
};

const parseAmount = (value) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value !== "string") return 0;
    const raw = value.trim().replace(/[^\d,.-]/g, "");
    if (!raw) return 0;
    let normalized = raw;
    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    if (hasComma && hasDot) {
        if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
            normalized = raw.replace(/\./g, "").replace(",", ".");
        } else {
            normalized = raw.replace(/,/g, "");
        }
    } else if (hasComma) {
        normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value) => {
    if (!value) return "-";
    return String(value).split("T")[0];
};

const formatCurrency = (value) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(parseAmount(value));

const getRevisionId = (revision) =>
    Number(firstDefined(revision?.idRev, revision?.idrev, revision?.id, 0));

const getRevisionTotal = (revision) =>
    parseAmount(firstDefined(
        revision?.totalRevision,
        revision?.totalrevision,
        revision?.total,
        revision?.monto,
        revision?.importe,
        revision?.montoTotal,
        revision?.montototal,
        0,
    ));

const getRevisionCantidadGastos = (revision) =>
    Number(firstDefined(
        revision?.cantidadGastos,
        revision?.cantGastos,
        revision?.cantidad,
        revision?.cant,
        revision?.nroGastos,
        0,
    )) || 0;

const getEstadoLabel = (revision) =>
    getWorkflowStatusLabel(resolveWorkflowStatus(revision, "PENDIENTE"));

const getEstadoBadgeClass = (revision) =>
    getWorkflowStatusBadgeClass(resolveWorkflowStatus(revision, "PENDIENTE"));

export default function RevisionList({
    revisiones,
    onVerDetalles,
    isExportMode = false,
    selectedRevisionIds = [],
    onToggleRevisionSelection,
    onToggleSelectAll,
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
    });

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(newSize));
        setCurrentPage(1);
    };

    const allRevisiones = Array.isArray(revisiones) ? revisiones : [];
    const totalPages = Math.max(1, Math.ceil(allRevisiones.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedRevisiones = allRevisiones.slice(startIdx, endIdx);
    const currentFrom = startIdx + 1;
    const currentTo = Math.min(endIdx, allRevisiones.length);

    const areAllSelected =
        allRevisiones.length > 0 &&
        allRevisiones.every((r) => selectedRevisionIds.includes(String(getRevisionId(r))));

    return (
        <section className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* TABLA DESKTOP */}
                <div className="hidden md:block max-h-[65vh] overflow-auto [scrollbar-width:thin]">
                    <table className="w-full min-w-225 text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                            <tr>
                                {isExportMode && (
                                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                                        <label className="inline-flex cursor-pointer items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={areAllSelected}
                                                onChange={onToggleSelectAll}
                                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                aria-label="Seleccionar todas las revisiones"
                                            />
                                            <span>Todos</span>
                                        </label>
                                    </th>
                                )}
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">#</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">ID</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Título</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Estado</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Fecha</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Total</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Cant. Gasto</th>
                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRevisiones.map((revision, index) => (
                                <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70">
                                    {isExportMode && (
                                        <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedRevisionIds.includes(String(getRevisionId(revision)))}
                                                onChange={() => onToggleRevisionSelection(revision)}
                                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                aria-label={`Seleccionar revision ${getRevisionId(revision)}`}
                                            />
                                        </td>
                                    )}
                                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">{startIdx + index + 1}</td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">{revision?.idRev ?? "-"}</td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">{revision?.titulo ?? revision?.title ?? "-"}</td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-center">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(revision)}`}>
                                            {getEstadoLabel(revision)}
                                        </span>
                                    </td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">{formatDate(revision?.fecCre)}</td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold tabular-nums text-slate-700">{formatCurrency(getRevisionTotal(revision))}</td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm tabular-nums text-slate-700">{getRevisionCantidadGastos(revision)}</td>
                                    <td className="border-b border-slate-100 px-2 py-1 text-center">
                                        <button
                                            type="button"
                                            onClick={() => onVerDetalles(revision)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                                        >
                                            <IconEye className="h-3.5 w-3.5 shrink-0" />
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* TARJETAS MOBILE */}
                <div className="space-y-2 p-2 md:hidden">
                    {isExportMode && (
                        <div className="mb-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-800">
                                <input
                                    type="checkbox"
                                    checked={areAllSelected}
                                    onChange={onToggleSelectAll}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    aria-label="Seleccionar todas las revisiones"
                                />
                                Seleccionar todos
                            </label>
                            <span className="text-[11px] font-semibold text-emerald-700">
                                {selectedRevisionIds.length} seleccionado(s)
                            </span>
                        </div>
                    )}
                    {paginatedRevisiones.map((revision, index) => (
                        <article key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                            {isExportMode && (
                                <input
                                    type="checkbox"
                                    checked={selectedRevisionIds.includes(String(getRevisionId(revision)))}
                                    onChange={() => onToggleRevisionSelection(revision)}
                                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    aria-label={`Seleccionar revision ${getRevisionId(revision)}`}
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-400">#{revision?.idRev ?? "-"}</span>
                                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getEstadoBadgeClass(revision)}`}>
                                        {getEstadoLabel(revision)}
                                    </span>
                                </div>
                                <h3 className="truncate text-sm font-bold text-slate-800">{revision?.titulo ?? revision?.title ?? "Sin título"}</h3>
                                <p className="truncate text-[11px] text-slate-500">{revision?.gerencia || "-"} · {formatDate(revision?.fecCre)}</p>
                                <p className="truncate text-[11px] font-semibold text-slate-600">Total: {formatCurrency(getRevisionTotal(revision))} · Gastos: {getRevisionCantidadGastos(revision)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onVerDetalles(revision)}
                                className="shrink-0 rounded-lg bg-cyan-600 p-2 text-white transition hover:bg-cyan-700 cursor-pointer"
                            >
                                <IconEye className="h-4 w-4" />
                            </button>
                        </article>
                    ))}
                </div>
            </div>

            <PaginationControls
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={allRevisiones.length}
                currentFrom={currentFrom}
                currentTo={currentTo}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
        </section>
    );
}
