import { useEffect, useMemo, useRef, useState } from "react";
import {
    getWorkflowStatusBadgeClass,
    getWorkflowStatusLabel,
    resolveWorkflowStatus,
} from "../shared/workflowStatus";
import { getMonedaSimbolo, resolveMoneda } from "../shared/moneda";
import { getListaRevisionDetalle } from "../../services";
import { IconEye } from "../../Icons/preview";
import { IconBroom } from "../../Icons/broom";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
    });

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(newSize));
        setCurrentPage(1);
    };

    const allRevisiones = useMemo(() => (Array.isArray(revisiones) ? revisiones : []), [revisiones]);
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredRevisiones = useMemo(() => {
        if (!normalizedSearch) return allRevisiones;

        return allRevisiones.filter((revision) => {
            const searchable = [
                getRevisionId(revision),
                revision?.idRev ?? revision?.id,
                revision?.titulo ?? revision?.title,
                getEstadoLabel(revision),
                formatDate(revision?.fecCre),
                formatCurrency(getRevisionTotal(revision)),
                getRevisionCantidadGastos(revision),
                revision?.gerencia,
                revision?.idrev,
            ]
                .filter((value) => value !== undefined && value !== null)
                .join(" ")
                .toLowerCase();

            return searchable.includes(normalizedSearch);
        });
    }, [allRevisiones, normalizedSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredRevisiones.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedRevisiones = filteredRevisiones.slice(startIdx, endIdx);
    const currentFrom = filteredRevisiones.length === 0 ? 0 : startIdx + 1;
    const currentTo = Math.min(endIdx, filteredRevisiones.length);

    const totalGastos = useMemo(
        () => filteredRevisiones.reduce((acc, r) => acc + getRevisionCantidadGastos(r), 0),
        [filteredRevisiones],
    );

    const areAllSelected =
        filteredRevisiones.length > 0 &&
        filteredRevisiones.every((r) => selectedRevisionIds.includes(String(getRevisionId(r))));

    // El total de la revisión llega combinado desde el backend (soles + dólares mezclados),
    // por eso se calcula el subtotal real por moneda a partir del detalle de gastos de cada una.
    const [totalesPorMonedaPorRevision, setTotalesPorMonedaPorRevision] = useState({});
    const fetchedRevisionIdsRef = useRef(new Set());

    useEffect(() => {
        const pendientes = paginatedRevisiones.filter((revision) => {
            const id = getRevisionId(revision);
            return id && !fetchedRevisionIdsRef.current.has(id);
        });

        if (pendientes.length === 0) return;

        pendientes.forEach((revision) => {
            const id = getRevisionId(revision);
            fetchedRevisionIdsRef.current.add(id);
            const idrev = revision?.idRev ?? revision?.idrev ?? revision?.id;

            getListaRevisionDetalle({ idrev: String(idrev) })
                .then((detalleData) => {
                    const acumulado = new Map();
                    (Array.isArray(detalleData) ? detalleData : []).forEach((detalle) => {
                        const moneda = resolveMoneda(detalle);
                        const monto = parseAmount(
                            detalle?.total ?? detalle?.monto ?? detalle?.importe ?? detalle?.valor ?? 0,
                        );
                        acumulado.set(moneda, (acumulado.get(moneda) || 0) + monto);
                    });

                    setTotalesPorMonedaPorRevision((prev) => ({
                        ...prev,
                        [id]: Object.fromEntries(acumulado),
                    }));
                })
                .catch(() => {
                    fetchedRevisionIdsRef.current.delete(id);
                });
        });
    }, [paginatedRevisiones]);

    // Solo muestra el subtotal real (por detalle de gastos) de la moneda a la que corresponde la columna.
    const formatCurrencyPorMoneda = (revision, monedaCodigo) => {
        const id = getRevisionId(revision);
        const totales = totalesPorMonedaPorRevision[id];
        if (!totales) return "...";
        const monto = totales[monedaCodigo];
        if (monto === undefined) return "-";
        return `${getMonedaSimbolo(monedaCodigo)} ${monto.toFixed(2)}`;
    };

    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2">
          <div className="mb-4 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por titulo,IdRev, estado, fecha o total"
              className="min-w-48 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />

            <button
              type="button"
              title="Limpiar busqueda"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer sm:h-auto sm:w-auto sm:px-3 sm:py-2.5"
            >
              <IconBroom className="h-5 w-5" />
            </button>
          </div>

          {/* TABLA DESKTOP */}
          <div className="hidden max-h-[65dvh] overflow-hidden md:flex md:flex-col">
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      #
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      ID
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Título
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Usuario
                    </th>
                    <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Gerencia
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
                    {/*   <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Cant. Gasto
                    </th> */}
                    <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRevisiones.map((revision, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-100 hover:bg-slate-50/70"
                    >
                      {isExportMode && (
                        <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedRevisionIds.includes(
                              String(getRevisionId(revision)),
                            )}
                            onChange={() => onToggleRevisionSelection(revision)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            aria-label={`Seleccionar revision ${getRevisionId(revision)}`}
                          />
                        </td>
                      )}
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {startIdx + index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {revision?.idRev ?? "-"}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                        {revision?.titulo ?? revision?.title ?? "-"}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                        {revision?.usuario ?? revision?.title ?? "-"}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                        {revision?.gerencia ?? "-"}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(revision)}`}
                        >
                          {getEstadoLabel(revision)}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                        {formatDate(revision?.fecCre)}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold tabular-nums text-slate-700">
                        {formatCurrencyPorMoneda(revision, "PEN")}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold tabular-nums text-slate-700">
                        {formatCurrencyPorMoneda(revision, "USD")}
                      </td>
                      {/*  <td className="border-b border-slate-100 px-2 py-1 text-center text-sm tabular-nums text-slate-700">
                        {getRevisionCantidadGastos(revision)}
                      </td> */}
                      <td className="border-b border-slate-100 px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => onVerDetalles(revision)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                        >
                          <IconEye className="h-3.5 w-3.5 shrink-0" />
                          {/*                           Ver Detalles
                           */}{" "}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
              <PaginationControls
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredRevisiones.length}
                currentFrom={currentFrom}
                currentTo={currentTo}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            </div>
          </div>

          {/* TARJETAS MOBILE */}
          <div className="max-h-[65dvh] overflow-hidden md:hidden flex flex-col">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain touch-pan-y p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {paginatedRevisiones.map((revision, index) => (
                <article
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5"
                >
                  {isExportMode && (
                    <input
                      type="checkbox"
                      checked={selectedRevisionIds.includes(
                        String(getRevisionId(revision)),
                      )}
                      onChange={() => onToggleRevisionSelection(revision)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={`Seleccionar revision ${getRevisionId(revision)}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        #{revision?.idRev ?? "-"}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getEstadoBadgeClass(revision)}`}
                      >
                        {getEstadoLabel(revision)}
                      </span>
                    </div>
                    <h3 className="truncate text-sm font-bold text-slate-800">
                      {revision?.titulo}
                    </h3>
                    <p className="truncate text-[11px] text-slate-500">
                      Creación: {formatDate(revision?.fecCre)}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      Usuario: {revision?.usuario || "-"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      Gerencia: {revision?.gerencia || "-"}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-slate-600">
                      
                      Detalles:{getRevisionCantidadGastos(revision)}
                    </p>
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
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
              <PaginationControls
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredRevisiones.length}
                currentFrom={currentFrom}
                currentTo={currentTo}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            </div>
          </div>
        </div>
      </section>
    );
}
