import { useEffect, useMemo, useState } from "react";
import { IconAdd } from "../../Icons/add";
import { IconDelete } from "../../Icons/delete";
import IconUpdate from "../../Icons/update";
import IconSend from "../../Icons/send";
import { IconEye } from "../../Icons/preview";
import { getWorkflowStatusBadgeClass, getWorkflowStatusLabel } from "../shared/workflowStatus";
import EvidenciaImagen from "../Gasto/EvidenciaImagen";

export default function InformeVistaPrevia({
    isOpen,
    onClose,
    onGuardar,
    onEnviarAuditoria,
    titulo,
    fecha,
    cantidadGastos,
    politica,
    categoria,
    gastosPolitica = [],
    selectedIniciales = [],
    idInf = null,
    estadoActual = "",
}) {
    const [selectedGastos, setSelectedGastos] = useState([]);
    const [initialSelectedGastos, setInitialSelectedGastos] = useState([]);
    const [isAdjuntarOpen, setIsAdjuntarOpen] = useState(false);
    const [gastosParaAdjuntar, setGastosParaAdjuntar] = useState([]);
    const [isQuitarOpen, setIsQuitarOpen] = useState(false);
    const [gastosParaQuitar, setGastosParaQuitar] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [gastoDetalle, setGastoDetalle] = useState(null);
    const [zoomSrc, setZoomSrc] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
    const zoomDragRef = { isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 };

    // ✅ Verificar si está permitida la edición: solo "EN INFORME"
    const estadoNorm = String(estadoActual).trim().toUpperCase();
    const isEditingAllowed = estadoNorm === "EN INFORME";

    const getGastoId = (gasto) => String(gasto?.idrend ?? gasto?.idRend ?? gasto?.id ?? "");

    const firstDefined = (...values) => {
        for (const value of values) {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return "";
    };

    const getGastoEstadoActual = (gasto) =>
        String(
            gasto?.estadoActual ??
            gasto?.estadoactual ??
            gasto?.EstadoActual ??
            gasto?.estado ??
            ""
        )
            .trim()
            .toUpperCase();

    const getGastoAmount = (gasto) =>
        parseAmount(
            gasto?.total ??
            gasto?.monto ??
            gasto?.importe ??
            gasto?.amount ??
            gasto?.valor ??
            gasto?.subtotal ??
            gasto?.montoTotal ??
            gasto?.montototal ??
            gasto?.importeTotal ??
            gasto?.totalComprobante ??
            0
        );

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
            normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    useEffect(() => {
        if (isOpen) {
            // ✅ Normalizar IDs a strings para garantizar matching
            const normalized = Array.isArray(selectedIniciales)
                ? selectedIniciales.map(id => String(id))
                : [];
            /* console.log("📌 selectedIniciales normalizadas (strings):", normalized); */

            const timeoutId = window.setTimeout(() => {
                setSelectedGastos(normalized);
                setInitialSelectedGastos(normalized);
                setGastosParaAdjuntar([]);
            }, 0);

            return () => window.clearTimeout(timeoutId);
        }
    }, [isOpen, selectedIniciales]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;

            if (isAdjuntarOpen) {
                setIsAdjuntarOpen(false);
                setGastosParaAdjuntar([]);
                return;
            }

            if (isQuitarOpen) {
                setIsQuitarOpen(false);
                setGastosParaQuitar([]);
                return;
            }

            onClose?.();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isAdjuntarOpen, isQuitarOpen, onClose]);

    const gastosSeleccionadosDetalle = useMemo(() => {
        /*  console.log("🔍 [Filter Debug] selectedGastos a buscar:", selectedGastos);
         console.log("🔍 [Filter Debug] gastosPolitica disponibles:", gastosPolitica.length); */

        const gastosById = new Map(
            (Array.isArray(gastosPolitica) ? gastosPolitica : []).map((g) => [String(getGastoId(g)), g])
        );

        const result = selectedGastos.map((id) => {
            const normalizedId = String(id);
            const gasto = gastosById.get(normalizedId);

            if (gasto) return gasto;

            // Fallback: si no llegó el detalle, al menos mostrar el ID seleccionado del informe.
            return {
                idrend: normalizedId,
                categoria: `Gasto #${normalizedId}`,
                fecha: "-",
                total: 0,
            };
        });

        /* console.log("✅ gastosSeleccionadosDetalle encontrados:", result.length); */
        return result;
    }, [gastosPolitica, selectedGastos]);

    const gastosDisponiblesParaAgregar = useMemo(() => {
        const selectedSet = new Set((selectedGastos || []).map((id) => String(id)));
        const seen = new Set();

        return (Array.isArray(gastosPolitica) ? gastosPolitica : []).filter((g) => {
            const id = getGastoId(g);
            if (!id) return false;
            if (seen.has(id)) return false;
            if (selectedSet.has(id)) return false;
            if (getGastoEstadoActual(g) !== "BORRADOR") return false;

            seen.add(id);
            return true;
        });
    }, [gastosPolitica, selectedGastos]);

    const total = gastosSeleccionadosDetalle
        .reduce((acc, gasto) => acc + getGastoAmount(gasto), 0)
        .toFixed(2);

    const formatFecha = (value) => {
        if (!value) return "-";
        const raw = String(value);
        return raw.includes("T") ? raw.split("T")[0] : raw;
    };

    const cantidadResumen =
        typeof cantidadGastos === "number" && Number.isFinite(cantidadGastos)
            ? cantidadGastos
            : (selectedGastos?.length ?? 0);

    const categoriaResumen = useMemo(() => {
        if (categoria) return categoria;
        const unique = Array.from(
            new Set(
                (gastosSeleccionadosDetalle || [])
                    .map((g) => String(g?.categoria ?? "").trim())
                    .filter((value) => value)
            )
        );
        return unique.join(", ");
    }, [categoria, gastosSeleccionadosDetalle]);

    // ✅ Verificar si hay cambios en los gastos seleccionados
    const hasChanges = useMemo(() => {
        if (selectedGastos.length !== initialSelectedGastos.length) return true;
        const selectedSet = new Set(selectedGastos);
        return !initialSelectedGastos.every((id) => selectedSet.has(id));
    }, [selectedGastos, initialSelectedGastos]);

    const fechaResumen = formatFecha(fecha);

    const normalizeText = (value) =>
        String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();

    const isPlanillaMovilidad = useMemo(() => {
        const categoriaRaw = normalizeText(gastoDetalle?.categoria);
        const tipoRaw = normalizeText(firstDefined(
            gastoDetalle?.tipogasto,
            gastoDetalle?.tipoGasto,
            gastoDetalle?.tipo_gasto,
            gastoDetalle?.tipoMovilidad,
            gastoDetalle?.movilidad,
            gastoDetalle?.transporte,
        ));
        const politicaRaw = normalizeText(gastoDetalle?.politica ?? politica);
        const hasMovilidadFields = [
            gastoDetalle?.lugarOrigen,
            gastoDetalle?.lugarorigen,
            gastoDetalle?.origen,
            gastoDetalle?.lugarDestino,
            gastoDetalle?.lugardestino,
            gastoDetalle?.destino,
            gastoDetalle?.tipoMovilidad,
            gastoDetalle?.tipomovilidad,
            gastoDetalle?.tipo_movilidad,
            gastoDetalle?.movilidad,
            gastoDetalle?.transporte,
        ].some((value) => String(value ?? "").trim() !== "");
        const keywords = ["MOVILIDAD", "PLANILLA DE MOVILIDAD", "GASTOS DE MOVILIDAD"];

        return hasMovilidadFields || [categoriaRaw, tipoRaw, politicaRaw].some((value) =>
            keywords.some((keyword) => value.includes(keyword))
        );
    }, [gastoDetalle, politica]);

    const handleEditar = () => {
        setGastosParaAdjuntar([]);
        setIsAdjuntarOpen(true);
    };

    const handleGuardar = async () => {
        if (selectedGastos.length === 0) {
            alert("⚠️ Debes seleccionar al menos un gasto para guardar el informe.");
            return;
        }

        if (!idInf) {
            alert("⚠️ Error: No se encontró el ID del informe.");
            return;
        }

        setIsSaving(true);
        try {
            if (typeof onGuardar !== "function") {
                throw new Error("No se encontró el handler de guardado");
            }

            // El guardado real se centraliza en el padre para evitar duplicados.
            await onGuardar(selectedGastos);
        } catch (error) {
            /* console.error("❌ Error al guardar:", error); */
            const errorMsg = error?.response?.data?.message || error?.message || "Inténtalo nuevamente";
            alert(`❌ Error al guardar: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnviarAuditoria = () => {
        if (selectedGastos.length === 0) return;
        if (typeof onEnviarAuditoria === "function") {
            onEnviarAuditoria(selectedGastos);
        }
    };

    const handleToggleAdjuntar = (gastoId) => {
        const normalizedId = String(gastoId);
        if (!normalizedId) return;

        setGastosParaAdjuntar((prev) =>
            prev.includes(normalizedId)
                ? prev.filter((id) => id !== normalizedId)
                : [...prev, normalizedId]
        );
    };

    const handleAdjuntarGastos = () => {
        if (gastosParaAdjuntar.length === 0) return;
        const normalizedToAdd = gastosParaAdjuntar.map(id => String(id));
        setSelectedGastos((prev) => {
            const updated = Array.from(new Set([...prev, ...normalizedToAdd]));
            return updated;
        });
        setGastosParaAdjuntar([]);
        setIsAdjuntarOpen(false);
    };

    const handleOpenQuitar = () => {
        setGastosParaQuitar([]);
        setIsQuitarOpen(true);
    };

    const handleToggleQuitar = (gastoId) => {
        const normalizedId = String(gastoId);
        if (!normalizedId) return;

        setGastosParaQuitar((prev) =>
            prev.includes(normalizedId)
                ? prev.filter((id) => id !== normalizedId)
                : [...prev, normalizedId]
        );
    };

    const handleQuitarGastos = () => {
        if (gastosParaQuitar.length === 0) return;

        const setQuitar = new Set(gastosParaQuitar.map((id) => String(id)));
        setSelectedGastos((prev) => {
            const updated = prev.filter((id) => !setQuitar.has(String(id)));
            return updated;
        });
        setGastosParaQuitar([]);
        setIsQuitarOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 mt-6 sm:mt-0">
            {/* Loading overlay */}
            {isSaving && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="h-6 w-6 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"></div>
                            <span className="text-base font-semibold text-slate-700 sm:text-lg">Guardando informe...</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex max-h-[87vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-white/30 bg-white shadow-2xl sm:rounded-2xl">
                {/* VISTA PREVIA DEL INFORME */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-indigo-50 px-4 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="h-7 w-1 rounded-full bg-linear-to-b from-blue-600 via-blue-700 to-indigo-500 sm:h-9" />
                        <h2 className="min-w-0 text-sm font-extrabold text-slate-800 sm:text-base">
                            <span className="flex flex-wrap items-center gap-1.5">
                                <span>Vista del Informe</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-blue-700">{titulo || "-"}</span>
                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:text-xs"># ID Inf: {idInf || "-"}</span>
                            </span>
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 sm:px-3.5 sm:py-1.5 sm:text-sm"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    {/* Resumen del informe */}
                    <div className="grid gap-4 p-4 ">
                        <section className="">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Resumen</h3>

                            </div>

                            <div className="grid grid-cols-2 gap-1 text-xs text-slate-700 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">


                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-semibold uppercase text-slate-500">Fecha</p>
                                    <p className="line-clamp-1 font-semibold text-slate-900">{fechaResumen}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-semibold uppercase text-slate-500">Cantidad de Gastos</p>
                                    <p className="line-clamp-1 font-semibold text-slate-900">
                                        {cantidadResumen !== null && cantidadResumen !== undefined ? cantidadResumen : "-"}
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-semibold uppercase text-slate-500">Política</p>
                                    <p className="line-clamp-1 font-semibold text-slate-900">{politica || "-"}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-semibold uppercase text-slate-500">Categoría</p>
                                    <p className="line-clamp-1 font-semibold text-slate-900">{categoriaResumen || "-"}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-semibold uppercase text-slate-500">Total</p>
                                    <p className="font-extrabold text-cyan-700">S/ {total}</p>
                                </div>
                                <div className="col-span-2 space-y-0.5 sm:col-span-1">
                                    <p className="text-[9px] font-semibold uppercase text-slate-500">Estado</p>
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getWorkflowStatusBadgeClass(estadoActual, true)}`}>
                                        {getWorkflowStatusLabel(estadoActual) || "-"}
                                    </span>
                                </div>

                            </div>
                        </section>
                    </div>

                    {/* LISTA DE GASTOS DEL INFORME */}
                    <section className="border-t border-slate-100">
                        <div className="flex items-center justify-between px-4 pt-3 sm:px-6 sm:pt-4">
                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Gastos del informe ({gastosSeleccionadosDetalle.length})
                            </h3>
                        </div>

                        <div className="px-4 pb-3 pt-2 sm:px-6">
                            <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 [scrollbar-width:thin]">
                                {gastosSeleccionadosDetalle.length === 0 && (
                                    <p className="px-3 py-4 text-center text-xs text-slate-400">Sin gastos asociados</p>
                                )}

                                {gastosSeleccionadosDetalle.map((gasto) => {
                                    const id = getGastoId(gasto);
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setGastoDetalle(gasto)}
                                            className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 cursor-pointer"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-semibold text-slate-400">#{gasto.idrend || "-"}</span>
                                                    <span className="truncate text-xs font-semibold text-slate-700">{gasto.categoria || "-"}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400">{gasto.fecha?.split("T")[0] || "-"}</p>
                                            </div>
                                            <span className="shrink-0 text-xs font-bold text-cyan-700">
                                                S/ {getGastoAmount(gasto).toFixed(2)}
                                            </span>
                                            <IconEye className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                    {/*LISTAS DE GASTOS DE ACUERDO A LA POLÍTICA */}
                    <section className="border-t border-slate-100">
                        <div className="flex items-center justify-between px-4 pt-3 sm:px-6 sm:pt-4">
                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Gastos no seleccionados ({gastosDisponiblesParaAgregar.length})
                            </h3>
                        </div>

                        <div className="px-4 pb-3 pt-2 sm:px-6">
                            <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 [scrollbar-width:thin]">
                                {gastosDisponiblesParaAgregar.length === 0 && (
                                    <p className="px-3 py-4 text-center text-xs text-slate-400">
                                        Sin gastos disponibles en esta política
                                    </p>
                                )}

                                {gastosDisponiblesParaAgregar.map((gasto) => {
                                    const id = getGastoId(gasto);
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setGastoDetalle(gasto)}
                                            className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 cursor-pointer"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-semibold text-slate-400">#{gasto.idrend || "-"}</span>
                                                    <span className="truncate text-xs font-semibold text-slate-700">{gasto.categoria || "-"}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400">{gasto.fecha?.split("T")[0] || "-"}</p>
                                            </div>
                                            <span className="shrink-0 text-xs font-bold text-blue-600">
                                                S/ {getGastoAmount(gasto).toFixed(2)}
                                            </span>
                                            <IconEye className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>


                {/* Botones de acción */}
                <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 px-2 py-2 backdrop-blur sm:px-6 sm:py-4">
                    <div className="flex flex-row gap-1.5 sm:gap-2 sm:grid sm:grid-cols-2 sm:xl:grid-cols-4">
                        {/* EDITAR GASTO */}
                        <button
                            type="button"
                            onClick={handleEditar}
                            disabled={isSaving || !isEditingAllowed}
                            className="flex-1 flex flex-col items-center justify-center min-h-9 rounded-lg bg-amber-500 px-1.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:min-h-12 sm:rounded-xl sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm cursor-pointer"
                            title={!isEditingAllowed ? "No se puede editar en estado aprobado" : ""}
                        >
                            <IconAdd className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                            <span className="hidden sm:inline">Agregar Gasto</span>
                        </button>

                        {/*QUITAR GASTO */}
                        <button
                            type="button"
                            onClick={handleOpenQuitar}
                            disabled={isSaving || !isEditingAllowed}
                            className="flex-1 flex flex-col items-center justify-center min-h-9 rounded-lg bg-rose-500 px-1.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:min-h-12 sm:rounded-xl sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm cursor-pointer"
                            title={!isEditingAllowed ? "No se puede editar en estado aprobado" : ""}
                        >
                            <IconDelete className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                            <span className="hidden sm:inline">Quitar Gasto</span>
                        </button>

                        {/* GUARDAR INFORME */}
                        <button
                            type="button"
                            onClick={handleGuardar}
                            disabled={isSaving || selectedGastos.length === 0 || !isEditingAllowed || !hasChanges}
                            className="flex-1 flex flex-col items-center justify-center min-h-9 rounded-lg bg-emerald-600 px-1.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:min-h-12 sm:rounded-xl sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm cursor-pointer"
                            title={!isEditingAllowed ? "No se puede editar en estado aprobado" : !hasChanges ? "Debes agregar o quitar gastos para actualizar" : ""}
                        >
                            <IconUpdate className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                            <span className="hidden sm:inline">Actualizar Informe</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleEnviarAuditoria}
                            disabled={isSaving || selectedGastos.length === 0 || !isEditingAllowed}
                            className="flex-1 flex flex-col items-center justify-center min-h-9 rounded-lg bg-indigo-600 px-1.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:min-h-12 sm:rounded-xl sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm cursor-pointer"
                            title={!isEditingAllowed ? "No se puede editar en estado aprobado" : ""}
                        >
                            <IconSend className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                            <span className="hidden sm:inline">Enviar a Auditoría</span>
                        </button>
                    </div>
                </div>

                {/* MODAL DETALLE DE GASTO */}
                {gastoDetalle && (
                    <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
                        <button
                            type="button"
                            aria-label="Cerrar detalle"
                            className="absolute inset-0"
                            onClick={() => setGastoDetalle(null)}
                        />
                        <div className="relative z-10 flex w-full max-h-[85dvh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-linear-to-r from-cyan-50 to-slate-50 px-3 py-2 sm:rounded-t-2xl">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Detalle : # {getGastoId(gastoDetalle)}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGastoDetalle(null)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="max-h-[60vh] overflow-y-auto p-5">
                                {/* Evidencia */}
                                <div className="mb-5">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Evidencia</p>
                                    <EvidenciaImagen
                                        gasto={gastoDetalle}
                                        alt="Evidencia del gasto"
                                        className="w-full cursor-zoom-in rounded-xl border border-slate-200 object-contain shadow-sm transition hover:opacity-90"
                                        style={{ maxHeight: "220px" }}
                                        onClick={(e) => setZoomSrc(e.currentTarget.src)}
                                        fallback={
                                            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                                                <p className="text-xs text-slate-400">Sin evidencia adjunta</p>
                                            </div>
                                        }
                                    />
                                </div>

                                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                                    <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">Datos Generales del Gasto</h2>
                                    {[
                                        { label: "Política", value: firstDefined(gastoDetalle?.politica, gastoDetalle?.pol) },
                                        {
                                            label: "Centro Costo:",
                                            value: firstDefined(
                                                gastoDetalle?.centroCosto,
                                                gastoDetalle?.centrocosto,
                                                gastoDetalle?.centro_costo,
                                                gastoDetalle?.consumidor,
                                                gastoDetalle?.idCuenta,
                                                gastoDetalle?.idcuenta,
                                            )
                                        },
                                        { label: "Categoría:", value: firstDefined(gastoDetalle?.categoria, gastoDetalle?.cat) },
                                        {
                                            label: "Tipo gasto",
                                            value: firstDefined(
                                                gastoDetalle?.tipogasto,
                                                gastoDetalle?.tipoGasto,
                                                gastoDetalle?.tipo_gasto,
                                                gastoDetalle?.tipoMovilidad,
                                                gastoDetalle?.movilidad,
                                            )
                                        },
                                        { label: "RUC Emisor:", value: firstDefined(gastoDetalle?.ruc, gastoDetalle?.rucEmisor, gastoDetalle?.rucemisor) },
                                        { label: "Razón Social:", value: firstDefined(gastoDetalle?.proveedor, gastoDetalle?.empresa, gastoDetalle?.razonSocial, gastoDetalle?.razonsocial) },
                                        { label: "RUC Cliente:", value: firstDefined(gastoDetalle?.rucCliente, gastoDetalle?.ruccliente, gastoDetalle?.rucCli) },
                                        { label: "Placa", value: firstDefined(gastoDetalle?.placa, gastoDetalle?.vehiculoPlaca, gastoDetalle?.placaVehiculo, gastoDetalle?.nroPlaca) },
                                        { label: "Comprobante", value: gastoDetalle?.tipoComprobante ?? gastoDetalle?.tipocomprobante },
                                        { label: "Estado", value: gastoDetalle?.estadoActual ?? gastoDetalle?.estadoactual },
                                    ]
                                        .filter((f) => f.value)
                                        .map((f) => (
                                            <div key={f.label} className={f.colSpan ? "col-span-2" : ""}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                            </div>
                                        ))
                                    }
                                    <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">Monto del Gasto</h2>
                                    {[
                                        { label: "IGV", value: gastoDetalle?.igv != null ? `S/ ${Number(gastoDetalle.igv).toFixed(2)}` : null },
                                        { label: "Total", value: `S/ ${getGastoAmount(gastoDetalle).toFixed(2)}`, highlight: true },
                                    ]
                                        .filter((f) => f.value)
                                        .map((f) => (
                                            <div key={`monto-${f.label}`} className={f.colSpan ? "col-span-2" : ""}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                            </div>
                                        ))

                                    }
                                    <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">Datos de la Factura</h2>
                                    {(isPlanillaMovilidad
                                        ? [
                                            { label: "Tipo Comprobante", value: gastoDetalle?.tipoComprobante ?? gastoDetalle?.tipocomprobante },
                                            {
                                                label: "Fecha emisión",
                                                value: String(firstDefined(gastoDetalle?.fecha, gastoDetalle?.fecCre, gastoDetalle?.feccre) || "").split("T")[0],
                                            },
                                            { label: "Serie", value: firstDefined(gastoDetalle?.serie, gastoDetalle?.nroserie, gastoDetalle?.serieComprobante) },
                                            { label: "Número", value: firstDefined(gastoDetalle?.numero, gastoDetalle?.nro, gastoDetalle?.num, gastoDetalle?.nrodoc) },
                                            { label: "Total", value: `S/ ${getGastoAmount(gastoDetalle).toFixed(2)}` },
                                            { label: "LUGAR ORIGEN", value: firstDefined(gastoDetalle?.lugarOrigen, gastoDetalle?.lugarorigen, gastoDetalle?.origen, gastoDetalle?.puntoOrigen, gastoDetalle?.desde) || "-" },
                                            { label: "LUGAR DESTINO", value: firstDefined(gastoDetalle?.lugarDestino, gastoDetalle?.lugardestino, gastoDetalle?.destino, gastoDetalle?.puntoDestino, gastoDetalle?.hasta) || "-" },
                                            { label: "Motivo viaje", value: firstDefined(gastoDetalle?.motivoViaje, gastoDetalle?.motivo_viaje, gastoDetalle?.motivo, gastoDetalle?.glosa) },
                                            {
                                                label: "TIPO MOVILIDAD",
                                                value: firstDefined(
                                                    gastoDetalle?.tipoMovilidad,
                                                    gastoDetalle?.tipomovilidad,
                                                    gastoDetalle?.tipo_movilidad,
                                                    gastoDetalle?.movilidad,
                                                    gastoDetalle?.transporte,
                                                    gastoDetalle?.medioTransporte,
                                                    gastoDetalle?.medio_transporte,
                                                ) || "-"
                                            },
                                            { label: "Placa", value: firstDefined(gastoDetalle?.placa, gastoDetalle?.vehiculoPlaca, gastoDetalle?.placaVehiculo, gastoDetalle?.nroPlaca) },
                                            { label: "Observación", value: firstDefined(gastoDetalle?.obs, gastoDetalle?.observacion, gastoDetalle?.observaciones, gastoDetalle?.glosa), colSpan: true },
                                        ]
                                        : [
                                            { label: "Tipo Comprobante", value: gastoDetalle?.tipoComprobante ?? gastoDetalle?.tipocomprobante },
                                            {
                                                label: "Fecha",
                                                value: String(firstDefined(gastoDetalle?.fecha, gastoDetalle?.fecCre, gastoDetalle?.feccre) || "").split("T")[0],
                                            },
                                            {
                                                label: "Serie / N°",
                                                value: [
                                                    firstDefined(gastoDetalle?.serie, gastoDetalle?.nroserie, gastoDetalle?.serieComprobante),
                                                    firstDefined(gastoDetalle?.numero, gastoDetalle?.nro, gastoDetalle?.num, gastoDetalle?.nrodoc),
                                                ].filter(Boolean).join(" - "),
                                            },
                                        ])
                                        .filter((f) => f.value)
                                        .map((f) => (
                                            <div key={`factura-${f.label}`} className={f.colSpan ? "col-span-2" : ""}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                            </div>
                                        ))

                                    }
                                    {!isPlanillaMovilidad && (
                                        <>
                                            <h1 className="col-span-2 text-lg font-semibold text-slate-800">Observación:</h1>
                                            {[
                                                { label: "Observación", value: firstDefined(gastoDetalle?.obs, gastoDetalle?.observacion, gastoDetalle?.observaciones, gastoDetalle?.glosa), colSpan: true },
                                            ]
                                                .filter((f) => f.value)
                                                .map((f) => (
                                                    <div key={`obs-${f.label}`} className={f.colSpan ? "col-span-2" : ""}>
                                                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                        <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                                    </div>
                                                ))}
                                        </>
                                    )}
                                </dl>
                            </div>
                            {/* Footer */}
                            {/*  <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => setGastoDetalle(null)}
                                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Cerrar
                                </button>
                            </div> */}
                        </div>
                    </div>
                )}

                {/* LIGHTBOX ZOOM */}
                {zoomSrc && (
                    <div
                        className="fixed inset-0 z-70 flex items-center justify-center bg-black/90"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setZoomSrc(null);
                                setZoomScale(1);
                                setZoomPos({ x: 0, y: 0 });
                            }
                        }}
                        onWheel={(e) => {
                            e.preventDefault();
                            setZoomScale((prev) => Math.min(6, Math.max(0.5, prev - e.deltaY * 0.002)));
                        }}
                        style={{ touchAction: "none" }}
                    >
                        {/* Controles */}
                        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setZoomScale((p) => Math.min(6, +(p + 0.5).toFixed(1)))}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                                title="Acercar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM11 8v6M8 11h6" /></svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomScale((p) => Math.max(0.5, +(p - 0.5).toFixed(1)))}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                                title="Alejar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM8 11h6" /></svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setZoomScale(1); setZoomPos({ x: 0, y: 0 }); }}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                                title="Restablecer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setZoomSrc(null); setZoomScale(1); setZoomPos({ x: 0, y: 0 }); }}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                                title="Cerrar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Indicador de escala */}
                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                            {Math.round(zoomScale * 100)}%
                        </span>

                        {/* Imagen */}
                        <img
                            src={zoomSrc}
                            alt="Zoom evidencia"
                            draggable={false}
                            style={{
                                transform: `scale(${zoomScale}) translate(${zoomPos.x}px, ${zoomPos.y}px)`,
                                transformOrigin: "center",
                                transition: "transform 0.15s ease",
                                maxWidth: "90vw",
                                maxHeight: "90vh",
                                cursor: zoomScale > 1 ? "grab" : "zoom-in",
                                userSelect: "none",
                            }}
                            onMouseDown={(e) => {
                                if (zoomScale <= 1) { setZoomScale(2); return; }
                                zoomDragRef.isDragging = true;
                                zoomDragRef.startX = e.clientX;
                                zoomDragRef.startY = e.clientY;
                                zoomDragRef.originX = zoomPos.x;
                                zoomDragRef.originY = zoomPos.y;
                                e.currentTarget.style.cursor = "grabbing";
                            }}
                            onMouseMove={(e) => {
                                if (!zoomDragRef.isDragging) return;
                                const dx = (e.clientX - zoomDragRef.startX) / zoomScale;
                                const dy = (e.clientY - zoomDragRef.startY) / zoomScale;
                                setZoomPos({ x: zoomDragRef.originX + dx, y: zoomDragRef.originY + dy });
                            }}
                            onMouseUp={(e) => {
                                zoomDragRef.isDragging = false;
                                e.currentTarget.style.cursor = zoomScale > 1 ? "grab" : "zoom-in";
                            }}
                            onMouseLeave={() => { zoomDragRef.isDragging = false; }}
                            onClick={() => {
                                if (zoomScale === 1) setZoomScale(2);
                            }}
                        />
                    </div>
                )}

                {isAdjuntarOpen && (
                    <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
                            <div className="border-b border-slate-200 bg-linear-to-r from-cyan-50 via-white to-slate-50 px-5 py-4">
                                <h3 className="text-lg font-bold text-slate-900">Adjuntar o quitar gastos al informe</h3>
                            </div>

                            <div className="px-4 pb-3 pt-2 flex-1 overflow-y-auto">
                                <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 [scrollbar-width:thin]">
                                    {gastosDisponiblesParaAgregar.length === 0 && (
                                        <p className="px-3 py-4 text-center text-xs text-slate-400">No hay gastos disponibles para adjuntar.</p>
                                    )}
                                    {gastosDisponiblesParaAgregar.map((gasto) => {
                                        const id = getGastoId(gasto);
                                        const isChecked = gastosParaAdjuntar.includes(id);
                                        return (
                                            <div
                                                key={id}
                                                className={`flex w-full items-center gap-3 px-3 py-2.5 transition ${isChecked ? "bg-cyan-50" : "bg-white hover:bg-slate-50"}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAdjuntar(id)}
                                                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition cursor-pointer ${isChecked ? "border-cyan-600 bg-cyan-600" : "border-slate-300 bg-white"}`}
                                                >
                                                    {isChecked && (
                                                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAdjuntar(id)}
                                                    className="min-w-0 flex-1 text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-semibold text-slate-400">#{gasto.idrend || id || "-"}</span>
                                                        <span className="truncate text-xs font-semibold text-slate-700">{gasto.categoria || "-"}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400">{gasto.fecha?.split("T")[0] || "-"}</p>
                                                </button>
                                                <span className={`shrink-0 text-xs font-bold ${isChecked ? "text-cyan-700" : "text-blue-600"}`}>
                                                    S/ {getGastoAmount(gasto).toFixed(2)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setGastoDetalle(gasto)}
                                                    className="shrink-0 cursor-pointer rounded p-0.5 text-slate-300 transition hover:text-slate-500"
                                                    title="Ver detalle"
                                                >
                                                    <IconEye className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-row gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAdjuntarOpen(false);
                                        setGastosParaAdjuntar([]);
                                    }}
                                    className="flex-1 flex flex-row items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-1.5 py-1.5 sm:px-4 sm:py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                                >
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="hidden sm:inline">Cancelar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAdjuntarGastos}
                                    disabled={gastosParaAdjuntar.length === 0}
                                    className="flex-1 flex flex-row items-center justify-center gap-2 rounded-xl bg-cyan-600 px-1.5 py-1.5 sm:px-4 sm:py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:bg-slate-400 cursor-pointer"
                                >
                                    <IconAdd className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                    <span className="hidden sm:inline">Adjuntar gastos ({gastosParaAdjuntar.length})</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isQuitarOpen && (
                    <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
                            <div className="border-b border-slate-200 bg-linear-to-r from-amber-50 via-white to-slate-50 px-5 py-4">
                                <h3 className="text-lg font-bold text-slate-900">Quitar gastos del informe</h3>
                            </div>

                            <div className="px-4 pb-3 pt-2 flex-1 overflow-y-auto">
                                <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 [scrollbar-width:thin]">
                                    {gastosSeleccionadosDetalle.length === 0 && (
                                        <p className="px-3 py-4 text-center text-xs text-slate-400">No hay gastos asociados a este informe.</p>
                                    )}
                                    {gastosSeleccionadosDetalle.map((gasto) => {
                                        const id = getGastoId(gasto);
                                        const isChecked = gastosParaQuitar.includes(String(id));
                                        return (
                                            <div
                                                key={id}
                                                className={`flex w-full items-center gap-3 px-3 py-2.5 transition ${isChecked ? "bg-amber-50" : "bg-white hover:bg-slate-50"}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleQuitar(id)}
                                                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition cursor-pointer ${isChecked ? "border-amber-600 bg-amber-600" : "border-slate-300 bg-white"}`}
                                                >
                                                    {isChecked && (
                                                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleQuitar(id)}
                                                    className="min-w-0 flex-1 text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-semibold text-slate-400">#{gasto.idrend || id || "-"}</span>
                                                        <span className="truncate text-xs font-semibold text-slate-700">{gasto.categoria || "-"}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400">{gasto.fecha?.split("T")[0] || "-"}</p>
                                                </button>
                                                <span className={`shrink-0 text-xs font-bold ${isChecked ? "text-amber-700" : "text-blue-600"}`}>
                                                    S/ {getGastoAmount(gasto).toFixed(2)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setGastoDetalle(gasto)}
                                                    className="shrink-0 cursor-pointer rounded p-0.5 text-slate-300 transition hover:text-slate-500"
                                                    title="Ver detalle"
                                                >
                                                    <IconEye className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-row gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuitarOpen(false);
                                        setGastosParaQuitar([]);
                                    }}
                                    className="flex-1 flex flex-row items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-1.5 py-1.5 sm:px-4 sm:py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                                >
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="hidden sm:inline">Cancelar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleQuitarGastos}
                                    disabled={gastosParaQuitar.length === 0}
                                    className="flex-1 flex flex-row items-center justify-center gap-2 rounded-xl bg-amber-600 px-1.5 py-1.5 sm:px-4 sm:py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:bg-slate-400 cursor-pointer"
                                >
                                    <IconDelete className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                    <span className="hidden sm:inline">Quitar seleccionados ({gastosParaQuitar.length})</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}