import { useEffect, useMemo, useState } from "react";
import {
    getWorkflowStatusBadgeClass,
    resolveWorkflowStatus,
} from "../shared/workflowStatus";
import { IconEye } from "../../Icons/preview";
import PaginationControls from "../Gasto/PaginationControls";

export default function InformeList({ informes, onVistaPrevia, formatDate }) {
    const DEFAULT_ITEMS_PER_PAGE = 8;
    const PAGE_SIZE_STORAGE_KEY = "informe.pageSize";
    const PAGE_SIZE_OPTIONS = [5, 8, 10, 20, 50];
    const getEstadoInforme = (inf) => resolveWorkflowStatus(inf, "PENDIENTE");

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_ITEMS_PER_PAGE;
    });

    useEffect(() => {
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    }, [pageSize]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil((informes?.length || 0) / pageSize)),
        [informes, pageSize]
    );

    const effectiveCurrentPage = Math.min(currentPage, totalPages);

    const paginatedInformes = useMemo(() => {
        const start = (effectiveCurrentPage - 1) * pageSize;
        return (informes || []).slice(start, start + pageSize);
    }, [informes, effectiveCurrentPage, pageSize]);

    const currentFrom = informes.length === 0 ? 0 : (effectiveCurrentPage - 1) * pageSize + 1;
    const currentTo = (effectiveCurrentPage - 1) * pageSize + paginatedInformes.length;

    return (
        <section className="space-y-4">
            {/*  <div className="sticky top-20 z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-800">Listado de Informes</h2>
                    <p className="text-xs font-medium text-slate-500 sm:text-sm">
                        Página {effectiveCurrentPage} de {totalPages}
                    </p>
                </div>
            </div> */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="hidden max-h-[70vh] overflow-auto md:block">
                    <table className="w-full min-w-225 text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">#</th>
                                <th className="px-4 py-3 text-left font-semibold">Título</th>
                                <th className="px-4 py-3 text-left font-semibold">Política</th>
                                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedInformes.map((inf, index) => (
                                <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70">
                                    <td className="px-4 py-3 text-slate-700">{inf.idInf}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{inf.titulo || "-"}</td>
                                    <td className="px-4 py-3 text-slate-700">{inf.politica || "-"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getWorkflowStatusBadgeClass(getEstadoInforme(inf))}`}>
                                            {getEstadoInforme(inf)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{formatDate(inf.fecCre)}</td>
                                    {/*fecha?.split("T")[0] */}
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => onVistaPrevia(inf)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                                        >
                                            <IconEye className="h-3.5 w-3.5 shrink-0" />
                                            <span className="hidden sm:inline">Vista previa</span>
                                            <span className="sm:hidden">Ver</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2 md:hidden">
                    {paginatedInformes.map((inf, index) => (
                        <article key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-400">#{inf.idInf}</span>
                                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getWorkflowStatusBadgeClass(getEstadoInforme(inf))}`}>
                                        {getEstadoInforme(inf)}
                                    </span>
                                </div>
                                <h3 className="truncate text-sm font-bold text-slate-800">{inf.titulo || "Sin título"}</h3>
                                <p className="truncate text-[11px] text-slate-500">{inf.politica || "-"} · {formatDate(inf.fecCre)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onVistaPrevia(inf)}
                                className="shrink-0 rounded-lg bg-cyan-600 p-2 text-white transition hover:bg-cyan-700 cursor-pointer"
                            >
                                <IconEye className="h-4 w-4" />
                            </button>
                        </article>
                    ))}
                </div>

                <div className="border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
                    <PaginationControls
                        currentPage={effectiveCurrentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={informes.length}
                        currentFrom={currentFrom}
                        currentTo={currentTo}
                        pageSize={pageSize}
                        onPageSizeChange={(nextSize) => {
                            setPageSize(nextSize);
                            setCurrentPage(1);
                        }}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                    />
                </div>
            </div>
        </section>
    );
}