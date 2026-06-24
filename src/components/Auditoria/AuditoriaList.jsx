import { useMemo, useState } from "react";
import { IconBroom } from "../../Icons/broom";
import { IconEye } from "../../Icons/preview";
import PaginationControls from "../Gasto/PaginationControls";

export default function AuditoriaList({
    auditorias = [],
    isExportMode = false,
    selectedAuditoriaIds = [],
    getAuditoriaId,
    getEstadoBadgeClass,
    getEstadoLabel,
    formatDate,
    formatCurrency,
    getAuditoriaTotal,
    getAuditoriaCantidadGastos,
    currentPage,
    onPageChange,
    pageSize,
    onPageSizeChange,
    pageSizeOptions,
    onToggleSelectAllAuditorias,
    onToggleAuditoriaSelection,
    onVerDetalles,
}) {
    const [searchTerm, setSearchTerm] = useState("");

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredAuditorias = useMemo(() => {
        if (!normalizedSearch) return auditorias;

        return auditorias.filter((auditoria) => {
            const searchable = [
                getAuditoriaId(auditoria),
                auditoria?.idAd ?? auditoria?.id,
                auditoria?.dni,
                auditoria?.obs,
                getEstadoLabel(auditoria),
                formatDate(auditoria?.fecCre),
                formatCurrency(getAuditoriaTotal(auditoria)),
                getAuditoriaCantidadGastos(auditoria),
            ]
                .filter((value) => value !== undefined && value !== null)
                .join(" ")
                .toLowerCase();

            return searchable.includes(normalizedSearch);
        });
    }, [
        auditorias,
        normalizedSearch,
        getAuditoriaCantidadGastos,
        getAuditoriaId,
        getAuditoriaTotal,
        getEstadoLabel,
        formatCurrency,
        formatDate,
    ]);

    const resolvedTotalPages = Math.max(1, Math.ceil(filteredAuditorias.length / pageSize));
    const safePage = Math.min(currentPage, resolvedTotalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedAuditorias = filteredAuditorias.slice(startIdx, endIdx);
    const currentFrom = filteredAuditorias.length === 0 ? 0 : startIdx + 1;
    const currentTo = Math.min(endIdx, filteredAuditorias.length);

    const areAllSelected =
        filteredAuditorias.length > 0 &&
        filteredAuditorias.every((a) => selectedAuditoriaIds.includes(getAuditoriaId(a)));

    return (
        <section className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-2 py-1.5 sm:px-3 sm:py-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                onPageChange(1);
                            }}
                            placeholder="Buscar por ID, DNI, estado, fecha, total u observación"
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />

                        <button
                            type="button"
                            title="Limpiar búsqueda"
                            onClick={() => {
                                setSearchTerm("");
                                onPageChange(1);
                            }}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer sm:h-auto sm:w-auto sm:px-3 sm:py-2"
                        >
                            <IconBroom className="h-5 w-5" />
                        </button>

                    </div>
                </div>

                <div className="hidden max-h-[70dvh] overflow-hidden md:flex md:flex-col">
                    <div className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <table className="w-full min-w-225 text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                            <tr>
                                {isExportMode && (
                                    <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                                        <label className="inline-flex cursor-pointer items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={areAllSelected}
                                                onChange={() => onToggleSelectAllAuditorias(filteredAuditorias)}
                                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                aria-label="Seleccionar todas las auditorías"
                                            />
                                            <span>Todos</span>
                                        </label>
                                    </th>
                                )}
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">#</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">ID</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">DNI</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Estado</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Fecha</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Total</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Cant. Gastos</th>
                                <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedAuditorias.map((auditoria, index) => (
                                <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70">
                                    {isExportMode && (
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedAuditoriaIds.includes(getAuditoriaId(auditoria))}
                                                onChange={() => onToggleAuditoriaSelection(auditoria)}
                                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                aria-label={`Seleccionar auditoría ${getAuditoriaId(auditoria)}`}
                                            />
                                        </td>
                                    )}
                                    <td className="px-4 py-2 text-center text-slate-700">{currentFrom + index}</td>
                                    <td className="px-4 py-2 text-center text-slate-700">{auditoria?.idAd ?? auditoria?.id ?? "-"}</td>
                                    <td className="px-4 py-2 text-center text-slate-700">{auditoria?.dni ?? "-"}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(auditoria)}`}>
                                            {getEstadoLabel(auditoria)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-700">{formatDate(auditoria?.fecCre)}</td>
                                    <td className="px-4 py-2 text-center font-semibold tabular-nums text-slate-700">{formatCurrency(getAuditoriaTotal(auditoria))}</td>
                                    <td className="px-4 py-2 text-center tabular-nums text-slate-700">{getAuditoriaCantidadGastos(auditoria)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => onVerDetalles(auditoria)}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                                        >
                                            <IconEye className="h-4 w-4 shrink-0" />
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={resolvedTotalPages}
                            onPageChange={onPageChange}
                            totalItems={filteredAuditorias.length}
                            currentFrom={currentFrom}
                            currentTo={currentTo}
                            pageSize={pageSize}
                            onPageSizeChange={onPageSizeChange}
                            pageSizeOptions={pageSizeOptions}
                        />
                    </div>
                </div>

                <div className="max-h-[70dvh] overflow-hidden md:hidden flex flex-col">
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain touch-pan-y p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {paginatedAuditorias.map((auditoria, index) => (
                        <article key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                            {isExportMode && (
                                <input
                                    type="checkbox"
                                    checked={selectedAuditoriaIds.includes(getAuditoriaId(auditoria))}
                                    onChange={() => onToggleAuditoriaSelection(auditoria)}
                                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    aria-label={`Seleccionar auditoría ${getAuditoriaId(auditoria)}`}
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-400">
                                        #{auditoria?.idAd ?? auditoria?.id ?? currentFrom + index}
                                    </span>
                                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getEstadoBadgeClass(auditoria)}`}>
                                        {getEstadoLabel(auditoria)}
                                    </span>
                                </div>
                                <h3 className="truncate text-sm font-bold text-slate-800">{auditoria?.obs ?? "Sin observación"}</h3>
                                <p className="truncate text-[11px] text-slate-500">
                                    DNI: {auditoria?.dni ?? "-"} · {formatDate(auditoria?.fecCre)}
                                </p>
                                <p className="truncate text-[11px] font-semibold text-slate-600">
                                    Total: {formatCurrency(getAuditoriaTotal(auditoria))} · Gastos: {getAuditoriaCantidadGastos(auditoria)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onVerDetalles(auditoria)}
                                className="shrink-0 rounded-lg bg-cyan-600 p-2 text-white transition hover:bg-cyan-700"
                            >
                                <IconEye className="h-4 w-4" />
                            </button>
                        </article>
                    ))}
                    </div>
                    <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={resolvedTotalPages}
                            onPageChange={onPageChange}
                            totalItems={filteredAuditorias.length}
                            currentFrom={currentFrom}
                            currentTo={currentTo}
                            pageSize={pageSize}
                            onPageSizeChange={onPageSizeChange}
                            pageSizeOptions={pageSizeOptions}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
