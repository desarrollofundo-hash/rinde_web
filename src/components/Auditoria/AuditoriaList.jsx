import { useEffect, useMemo, useRef, useState } from "react";
import { IconBroom } from "../../Icons/broom";
import { IconEye } from "../../Icons/preview";
import PaginationControls from "../Gasto/PaginationControls";
import { getListaAuditoriaDetalle } from "../../services";
import { getMonedaSimbolo, resolveMoneda } from "../shared/moneda";

const parseAmount = (value) => {
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
    normalized = /,\d{1,2}$/.test(raw)
      ? raw.replace(",", ".")
      : raw.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  getAuditoriaCantidadAprobado,
  getAuditoriaCantidadDesaprobado,
  getAuditoriaTotalDesaprobado,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  onToggleSelectAllAuditorias,
  onToggleAuditoriaSelection,
  onVerDetalles,
  searchTerm = "",
}) {

  const tableScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0 });
    mobileScrollRef.current?.scrollTo({ top: 0 });
  }, [currentPage, pageSize]);

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
        getAuditoriaCantidadAprobado(auditoria),
        getAuditoriaCantidadDesaprobado(auditoria),
        formatCurrency(getAuditoriaTotalDesaprobado(auditoria)),
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
    getAuditoriaCantidadAprobado,
    getAuditoriaCantidadDesaprobado,
    getAuditoriaTotalDesaprobado,
    getAuditoriaId,
    getAuditoriaTotal,
    getEstadoLabel,
    formatCurrency,
    formatDate,
  ]);

  const resolvedTotalPages = Math.max(
    1,
    Math.ceil(filteredAuditorias.length / pageSize),
  );
  const safePage = Math.min(currentPage, resolvedTotalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedAuditorias = filteredAuditorias.slice(startIdx, endIdx);
  const currentFrom = filteredAuditorias.length === 0 ? 0 : startIdx + 1;
  const currentTo = Math.min(endIdx, filteredAuditorias.length);

  const areAllSelected =
    filteredAuditorias.length > 0 &&
    filteredAuditorias.every((a) =>
      selectedAuditoriaIds.includes(getAuditoriaId(a)),
    );

  // El total de la auditoría llega combinado desde el backend (soles + dólares mezclados),
  // por eso se calcula el subtotal real por moneda a partir del detalle de gastos de cada una.
  const [totalesPorMonedaPorAuditoria, setTotalesPorMonedaPorAuditoria] =
    useState({});
  const fetchedAuditoriaIdsRef = useRef(new Set());

  useEffect(() => {
    const pendientes = paginatedAuditorias.filter((auditoria) => {
      const id = getAuditoriaId(auditoria);
      return id && !fetchedAuditoriaIdsRef.current.has(id);
    });

    if (pendientes.length === 0) return;

    pendientes.forEach((auditoria) => {
      const id = getAuditoriaId(auditoria);
      fetchedAuditoriaIdsRef.current.add(id);
      const idAd = auditoria?.idAd ?? auditoria?.id;

      getListaAuditoriaDetalle({ idAd: String(idAd) })
        .then((detalleData) => {
          const acumulado = new Map();
          (Array.isArray(detalleData) ? detalleData : []).forEach((detalle) => {
            const moneda = resolveMoneda(detalle);
            const monto = parseAmount(
              detalle?.total ??
                detalle?.monto ??
                detalle?.importe ??
                detalle?.valor ??
                0,
            );
            acumulado.set(moneda, (acumulado.get(moneda) || 0) + monto);
          });

          setTotalesPorMonedaPorAuditoria((prev) => ({
            ...prev,
            [id]: Object.fromEntries(acumulado),
          }));
        })
        .catch(() => {
          fetchedAuditoriaIdsRef.current.delete(id);
        });
    });
  }, [paginatedAuditorias, getAuditoriaId]);

  // Solo muestra el subtotal real (por detalle de gastos) de la moneda a la que corresponde la columna.
  const formatCurrencyPorMoneda = (auditoria, monedaCodigo) => {
    const id = getAuditoriaId(auditoria);
    const totales = totalesPorMonedaPorAuditoria[id];
    if (!totales) return "...";
    const monto = totales[monedaCodigo];
    if (monto === undefined) return "-";
    return `${getMonedaSimbolo(monedaCodigo)} ${monto.toFixed(2)}`;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden xl:flex xl:flex-col flex-1 min-h-0 overflow-hidden">
          <div ref={tableScrollRef} className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-225 text-sm table-fixed">
              <colgroup>
                {isExportMode && <col className="w-10" />}
                <col className="w-10" />
                <col className="w-14" />
                <col className="w-20" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-16" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                <tr>
                  {isExportMode && (
                    <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      <label className="inline-flex cursor-pointer items-center gap-1">
                        <input
                          type="checkbox"
                          checked={areAllSelected}
                          onChange={() =>
                            onToggleSelectAllAuditorias(filteredAuditorias)
                          }
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          aria-label="Seleccionar todas las auditorías"
                        />
                        <span>Todos</span>
                      </label>
                    </th>
                  )}
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    #
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    ID
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    DNI
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    USUARIO
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    GERENCIA
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Estado
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Fecha
                  </th>
                  <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    S/.{" "}
                  </th>
                  <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    USD{" "}
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Cant. Gastos
                  </th>

                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Cant. Apro./ Desa.
                  </th>

                  {/*  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                      Total Desaprobado
                    </th> */}
                  <th className="border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedAuditorias.map((auditoria, index) => (
                  <tr
                    key={index}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    {isExportMode && (
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAuditoriaIds.includes(
                            getAuditoriaId(auditoria),
                          )}
                          onChange={() => onToggleAuditoriaSelection(auditoria)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          aria-label={`Seleccionar auditoría ${getAuditoriaId(auditoria)}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2 text-center text-slate-700">
                      {currentFrom + index}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700">
                      {auditoria?.idAd ?? auditoria?.id ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700">
                      {auditoria?.dni ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700 max-w-0">
                      <span className="block truncate">{auditoria?.usuario ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700 max-w-0">
                      <span className="block truncate">{auditoria?.gerencia ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(auditoria)}`}
                      >
                        {getEstadoLabel(auditoria)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700">
                      {formatDate(auditoria?.fecCre)}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-700">
                      {formatCurrencyPorMoneda(auditoria, "PEN")}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-700">
                      {formatCurrencyPorMoneda(auditoria, "USD")}
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums text-slate-700">
                      {getAuditoriaCantidadGastos(auditoria)}
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums font-bold">
                      <span className="text-emerald-600">
                        {getAuditoriaCantidadAprobado(auditoria)} Apro.
                      </span>
                      <span className="text-slate-400 font-bold"> / </span>
                      <span className="text-red-600">
                        {getAuditoriaCantidadDesaprobado(auditoria)} Desa.
                      </span>
                    </td>
                    {/* <td className="px-4 py-2 text-center font-semibold tabular-nums text-red-600">
                        {formatCurrency(getAuditoriaTotalDesaprobado(auditoria))}
                      </td> */}
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onVerDetalles(auditoria)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                      >
                        <IconEye className="h-4 w-4 shrink-0" />
                        {/* Ver Detalles */}
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

        <div className="xl:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
          <div ref={mobileScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain touch-pan-y p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {paginatedAuditorias.map((auditoria, index) => (
              <article
                key={index}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5"
              >
                {isExportMode && (
                  <input
                    type="checkbox"
                    checked={selectedAuditoriaIds.includes(
                      getAuditoriaId(auditoria),
                    )}
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
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getEstadoBadgeClass(auditoria)}`}
                    >
                      {getEstadoLabel(auditoria)}
                    </span>
                  </div>
                  <h3 className="truncate text-sm font-bold text-slate-800">
                    {auditoria?.titulo ?? ""}
                  </h3>
                  <p className="truncate text-[11px] text-slate-500">
                    Creación:{formatDate(auditoria?.fecCre)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Usuario: {auditoria?.usuario ?? "-"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Gerencia: {auditoria?.gerencia ?? "-"}
                  </p>
                  {/*  <p className="truncate text-[11px] font-semibold text-slate-600">
                      Total: {formatCurrency(getAuditoriaTotal(auditoria))} ·
                      Gastos: {getAuditoriaCantidadGastos(auditoria)}
                    </p> */}
                  {/*  <p className="truncate text-[11px] font-semibold text-emerald-600">
                      Aprobado: {getAuditoriaCantidadAprobado(auditoria)}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-red-600">
                      Desaprobado: {getAuditoriaCantidadDesaprobado(auditoria)} 
                    </p> */}
                  <p className="truncate text-[11px] font-semibold">
                    <span className="text-emerald-600">
                      Aprobado: {getAuditoriaCantidadAprobado(auditoria)}
                    </span>

                    <span className="mx-2 text-slate-400">/</span>

                    <span className="text-red-600">
                      Desaprobado: {getAuditoriaCantidadDesaprobado(auditoria)}
                    </span>
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
    </div>
  );
}
