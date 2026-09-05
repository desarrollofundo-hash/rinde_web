import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    getWorkflowStatusBadgeClass,
    resolveWorkflowStatus,
} from "../shared/workflowStatus";
import { getMonedaSimbolo, resolveMoneda } from "../shared/moneda";
import { getInformeDetalle } from "../../services/listar/listar_informe_detalle";
import { IconEye } from "../../Icons/preview";
import { IconBroom } from "../../Icons/broom";
import PaginationControls from "../Gasto/PaginationControls";

export default function InformeList({
    informes,
    onVistaPrevia,
    formatDate,
    isExportMode = false,
    selectedInformeIds = [],
    onToggleInformeSelection,
}) {
    const DEFAULT_ITEMS_PER_PAGE = 8;
    const PAGE_SIZE_STORAGE_KEY = "informe.pageSize";
    const PAGE_SIZE_OPTIONS = [5, 8, 10, 20, 50];
    const getEstadoInforme = (inf) => resolveWorkflowStatus(inf, "PENDIENTE");

    const parseAmount = useCallback((value) => {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value !== "string") {
            return 0;
        }

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
    }, []);

    const resolveInformeTotal = useCallback((inf) => parseAmount(inf?.total?? 0), [parseAmount]);
    const resolveInformeGastosCount = (inf) => Number(
        inf?.cantidadGastos
        ?? inf?.cantGastos
        ?? inf?.cantidad
        ?? inf?.cant
        ?? inf?.nroGastos
        ?? 0
    );

    const formatCurrency = useCallback((value, inf) => {
        const amount = parseAmount(value);
        return `${getMonedaSimbolo(resolveMoneda(inf))} ${amount.toFixed(2)}`;
    }, [parseAmount]);

    const getInformeId = (inf) => String(inf?.idInf ?? inf?.idinf ?? inf?.id ?? "");

    // El campo "total" del informe llega combinado desde el backend (soles + dólares mezclados),
    // por eso se calcula el subtotal real por moneda a partir del detalle de gastos de cada informe.
    const [totalesPorMonedaPorInforme, setTotalesPorMonedaPorInforme] = useState({});
    const fetchedInformeIdsRef = useRef(new Set());

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_ITEMS_PER_PAGE;
    });

    useEffect(() => {
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    }, [pageSize]);

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredInformes = useMemo(() => {
        const source = Array.isArray(informes) ? informes : [];
        if (!normalizedSearch) return source;

        return source.filter((inf) => {
            const searchable = [
                inf?.idinf ,
                inf?.titulo,
                inf?.politica,
                getEstadoInforme(inf),
                formatDate(inf?.fecCre),
                formatCurrency(resolveInformeTotal(inf), inf),
                resolveInformeGastosCount(inf),
            ]
                .filter((value) => value !== undefined && value !== null)
                .join(" ")
                .toLowerCase();

            return searchable.includes(normalizedSearch);
        });
    }, [formatCurrency, formatDate, informes, normalizedSearch, resolveInformeTotal]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil((filteredInformes?.length || 0) / pageSize)),
        [filteredInformes, pageSize]
    );

    const effectiveCurrentPage = Math.min(currentPage, totalPages);

    const paginatedInformes = useMemo(() => {
        const start = (effectiveCurrentPage - 1) * pageSize;
        return (filteredInformes || []).slice(start, start + pageSize);
    }, [filteredInformes, effectiveCurrentPage, pageSize]);

    const currentFrom = filteredInformes.length === 0 ? 0 : (effectiveCurrentPage - 1) * pageSize + 1;
    const currentTo = (effectiveCurrentPage - 1) * pageSize + paginatedInformes.length;

    useEffect(() => {
        const pendientes = paginatedInformes.filter((inf) => {
            const id = getInformeId(inf);
            return id && !fetchedInformeIdsRef.current.has(id);
        });

        if (pendientes.length === 0) return;

        let userData = null;
        let companyData = null;
        try {
            userData = JSON.parse(localStorage.getItem("user") || "null");
            companyData = JSON.parse(localStorage.getItem("company") || "null");
        } catch {
            userData = null;
            companyData = null;
        }
        const user = String(userData?.id ?? userData?.usecod ?? userData?.idUser ?? "");
        const ruc = String(companyData?.ruc ?? companyData?.RUC ?? companyData?.numRuc ?? "");

        pendientes.forEach((inf) => {
            const id = getInformeId(inf);
            fetchedInformeIdsRef.current.add(id);

            getInformeDetalle({ idinf: id, user, ruc })
                .then((detalleData) => {
                    const acumulado = new Map();
                    (Array.isArray(detalleData) ? detalleData : []).forEach((detalle) => {
                        const moneda = resolveMoneda(detalle);
                        const monto = parseAmount(
                            detalle?.total ?? detalle?.monto ?? detalle?.importe ?? detalle?.valor ?? 0,
                        );
                        acumulado.set(moneda, (acumulado.get(moneda) || 0) + monto);
                    });

                    setTotalesPorMonedaPorInforme((prev) => ({
                        ...prev,
                        [id]: Object.fromEntries(acumulado),
                    }));
                })
                .catch(() => {
                    fetchedInformeIdsRef.current.delete(id);
                });
        });
    }, [paginatedInformes, parseAmount]);

    // Solo muestra el subtotal real (por detalle de gastos) de la moneda a la que corresponde la columna.
    const formatCurrencyPorMoneda = useCallback((inf, monedaCodigo) => {
        const id = getInformeId(inf);
        const totales = totalesPorMonedaPorInforme[id];
        if (!totales) return "...";
        const monto = totales[monedaCodigo];
        if (monto === undefined) return "-";
        return `${getMonedaSimbolo(monedaCodigo)} ${monto.toFixed(2)}`;
    }, [totalesPorMonedaPorInforme]);

    // Junta los subtotales de PEN y USD del informe en un solo texto, separados por " · ".
    const formatTotalesInformeTexto = useCallback((inf) => {
        const id = getInformeId(inf);
        const totales = totalesPorMonedaPorInforme[id];
        if (!totales) return "...";

        const partes = Object.entries(totales).map(
            ([moneda, monto]) => `${getMonedaSimbolo(moneda)} ${monto.toFixed(2)}`,
        );

        return partes.length > 0 ? partes.join(" · ") : `${getMonedaSimbolo()} 0.00`;
    }, [totalesPorMonedaPorInforme]);

    return (
      <section className="space-y-4">
        {/*  <div className="sticky top-20 z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-800">Lista de Informes</h2>
                    <p className="text-xs font-medium text-slate-500 sm:text-sm">
                        Página {effectiveCurrentPage} de {totalPages}
                    </p>
                </div>
            </div> */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-2 sm:p-3">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, política, estado, fecha o total"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <button
                type="button"
                title="Limpiar búsqueda"
                onClick={() => setSearchTerm("")}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer sm:h-auto sm:w-auto sm:px-3 sm:py-2.5"
              >
                <IconBroom className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="hidden max-h-[70dvh] overflow-hidden md:flex md:flex-col">
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                  <tr>
                    {isExportMode && (
                      <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600"></th>
                    )}
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      #
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Título
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Política
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Estado
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Fecha
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      S/.{" "}
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      USD{" "}
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Cant. Gastos
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInformes.map((inf, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-100 hover:bg-slate-50/70"
                    >
                      {isExportMode && (
                        <td className="border-b border-slate-100 px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedInformeIds.includes(
                              String(inf?.idInf ?? inf?.idinf ?? inf?.id ?? ""),
                            )}
                            onChange={() => onToggleInformeSelection?.(inf)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            aria-label={`Seleccionar informe ${inf?.idInf ?? ""}`}
                          />
                        </td>
                      )}
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {inf.idInf}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                        {inf.titulo || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {inf.politica || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getWorkflowStatusBadgeClass(getEstadoInforme(inf))}`}
                        >
                          {getEstadoInforme(inf)}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {formatDate(inf.fecCre)}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-700">
                        {formatCurrencyPorMoneda(inf, "PEN")}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-700">
                        {formatCurrencyPorMoneda(inf, "USD")}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {resolveInformeGastosCount(inf)}
                      </td>
                      {/*fecha?.split("T")[0] */}
                      <td className="border-b border-slate-100 px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => onVistaPrevia(inf)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                        >
                          <IconEye className="h-3.5 w-3.5 shrink-0" />
                          {/* <span className="hidden sm:inline">Vista previa</span> */}
                          {/* <span className="sm:hidden">Ver</span> */}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
              <PaginationControls
                currentPage={effectiveCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredInformes.length}
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

          <div className="max-h-[70dvh] overflow-hidden md:hidden flex flex-col">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain touch-pan-y p-2">
              {paginatedInformes.map((inf, index) => (
                <article
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5"
                >
                  {isExportMode && (
                    <input
                      type="checkbox"
                      checked={selectedInformeIds.includes(
                        String(inf?.idInf ?? inf?.idinf ?? inf?.id ?? ""),
                      )}
                      onChange={() => onToggleInformeSelection?.(inf)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={`Seleccionar informe ${inf?.idInf ?? ""}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        #{inf.idInf}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getWorkflowStatusBadgeClass(getEstadoInforme(inf))}`}
                      >
                        {getEstadoInforme(inf)}
                      </span>
                    </div>
                    <h3 className="truncate text-sm font-bold text-slate-800">
                      {inf.titulo || "Sin título"}
                    </h3>
                    <p className="truncate text-[11px] text-slate-500">
                     Creación: {formatDate(inf.fecCre)}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-slate-600">
                      Total: {formatTotalesInformeTexto(inf)} ·
                      Gastos: {resolveInformeGastosCount(inf)}
                    </p>
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
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
              <PaginationControls
                currentPage={effectiveCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredInformes.length}
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
        </div>
      </section>
    );
}