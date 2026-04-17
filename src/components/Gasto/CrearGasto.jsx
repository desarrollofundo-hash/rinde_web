import { useState, useEffect, useRef, useCallback } from "react";
import { getDropdownOptionsPolitica } from "../../services/politica";
import GastoGeneral from "./FormGasto/GastoGeneral";
import GastoMovilidad from "./FormGasto/GastoMovilidad";
import { getListaGastos } from "../../services/listar/listar_gasto";
import { IconEye } from "../../Icons/preview";
import { IconEdit } from "../../Icons/edit";
import EditarGastoModal from "./EditarGastoModal";
import BaseModal from "./BaseModal";
import EvidenciaImagen from "./EvidenciaImagen";
import PaginationControls from "./PaginationControls";
import { IconBroom } from "../../Icons/broom";
import {
    ExportGastosToolbar,
    ExportGastosSummary,
    ExportGastosBulkSelect,
} from "./ExportGastosControls";
import { IconEtiqueta } from "../../Icons/etiqueta";
import {
    getWorkflowStatusBadgeClass,
} from "../shared/workflowStatus";
export default function CrearGasto() {
    const DEFAULT_PAGE_SIZE = 10;
    const PAGE_SIZE_STORAGE_KEY = "gasto.pageSize";
    const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
    //ESTADOS DE POLITICAS
    const [politicas, setPoliticas] = useState([]);
    //ESTADOS PARA MOSTRAR EL MODAL DE CREACION DE GASTO
    const [showModal, setShowModal] = useState(false);
    //ESTADOS PARA CONTROLAR LA CARGA DE POLITICAS Y ERRORES
    const [loading, setLoading] = useState(false);
    //ESTADO PARA GUARDAR ERRORES
    const [error, setError] = useState(null);
    //ESTADO PARA GUARDAR LA POLITICA SELECCIONADA
    const [selectedPolitica, setSelectedPolitica] = useState(null);
    //NUEVOS ESTADOS PARA LISTAR LOS GASTOS
    const [gastos, setGastos] = useState([]);
    const [loadingGastos, setLoadingGastos] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isExportMode, setIsExportMode] = useState(false);
    const [selectedGastoIds, setSelectedGastoIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
    });

    useEffect(() => {
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    }, [pageSize]);
    const [previewGasto, setPreviewGasto] = useState(null);
    const [editGasto, setEditGasto] = useState(null);
    const [zoomSrc, setZoomSrc] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
    const zoomDragRef = { isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 };
    const isFetchingRef = useRef(false);
    const pendingForceRefreshRef = useRef(false);
    const lastFetchAtRef = useRef(0);
    const fetchSequenceRef = useRef(0);

    const firstDefined = useCallback((...values) => {
        for (const value of values) {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return "";
    }, []);

    const getGlosaOrNota = useCallback((gasto) => firstDefined(
        gasto?.glosa,
        gasto?.nota,
        gasto?.observacion,
        gasto?.observaciones,
        gasto?.obs,
    ), [firstDefined]);

    const getGastoIdRend = useCallback((gasto) =>
        String(
            firstDefined(
                gasto?.idrend,
                gasto?.idRend,
                gasto?.idrendicion,
                gasto?.id,
            )
        ), [firstDefined]);

    const getGastoSelectionId = useCallback((gasto) => {
        const explicitId = firstDefined(
            gasto?.idrend,
            gasto?.idRend,
            gasto?.idrendicion,
            gasto?.id,
        );

        if (explicitId) return String(explicitId);

        const fallback = [
            firstDefined(gasto?.proveedor, "sin-proveedor"),
            firstDefined(gasto?.fecha, "sin-fecha"),
            firstDefined(gasto?.total, "0"),
            firstDefined(gasto?.tipogasto, "sin-tipo"),
            firstDefined(gasto?.categoria, "sin-categoria"),
        ].join("|");

        return fallback;
    }, [firstDefined]);

    const normalizeEstadoLabel = (estado) => String(estado ?? "Sin estado").replaceAll("_", " ");

    const normalizeText = useCallback((value) =>
        String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase(), []);

    const isMovilidadGasto = useCallback((gasto) => {
        const categoriaRaw = normalizeText(firstDefined(gasto?.categoria, gasto?.cat));
        const tipoRaw = normalizeText(firstDefined(
            gasto?.tipogasto,
            gasto?.tipoGasto,
            gasto?.tipo_gasto,
            gasto?.tipoMovilidad,
            gasto?.tipomovilidad,
            gasto?.tipo_movilidad,
            gasto?.movilidad,
            gasto?.transporte,
        ));
        const politicaRaw = normalizeText(firstDefined(gasto?.politica, gasto?.pol));

        const hasMovilidadFields = [
            gasto?.lugarOrigen,
            gasto?.lugarorigen,
            gasto?.origen,
            gasto?.lugarDestino,
            gasto?.lugardestino,
            gasto?.destino,
            gasto?.tipoMovilidad,
            gasto?.tipomovilidad,
            gasto?.tipo_movilidad,
            gasto?.movilidad,
            gasto?.transporte,
        ].some((value) => String(value ?? "").trim() !== "");

        const keywords = ["MOVILIDAD", "PLANILLA DE MOVILIDAD", "GASTOS DE MOVILIDAD"];
        return hasMovilidadFields || [categoriaRaw, tipoRaw, politicaRaw].some((value) =>
            keywords.some((keyword) => value.includes(keyword))
        );
    }, [firstDefined, normalizeText]);

    const parseDateValue = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    };

    const getDiasTranscurridos = (gasto) => {
        const fechaFactura = parseDateValue(gasto?.fecha);
        if (!fechaFactura) return "-";

        const fechaRegistro = parseDateValue(gasto?.fechaRegistro) || new Date();

        const factura = new Date(fechaFactura.getFullYear(), fechaFactura.getMonth(), fechaFactura.getDate());
        const registro = new Date(fechaRegistro.getFullYear(), fechaRegistro.getMonth(), fechaRegistro.getDate());
        const diffDays = Math.floor((registro.getTime() - factura.getTime()) / (1000 * 60 * 60 * 24));

        return diffDays >= 0 ? diffDays : 0;
    };

    const normalizeEstadoFlow = useCallback((rawEstado) => {
        const value = String(rawEstado ?? "").trim().toUpperCase().replaceAll("_", " ");
        if (!value) return "";
        if (value === "S" || value === "N") return "";
        if (value.includes("DESAPROB") || value.includes("RECHAZ")) return "RECHAZADO";
        if (value.includes("APROB")) return "APROBADO";
        if (value.includes("REVISION")) return "EN REVISION";
        if (value.includes("AUDITORIA")) return "EN AUDITORIA";
        if (value.includes("INFORME")) return "EN INFORME";
        if (value.includes("BORRADOR")) return "BORRADOR";
        if (value.includes("PENDIENTE")) return "PENDIENTE";
        return value;
    }, []);

    const isGastoEditable = useCallback((gasto) => {
        const estado = normalizeEstadoFlow(
            firstDefined(gasto?.estadoActual, gasto?.estadoactual, gasto?.EstadoActual, "")
        );
        return estado !== "RECHAZADO" && estado !== "APROBADO" && estado !== "EN AUDITORIA" && estado !== "EN REVISION";
    }, [normalizeEstadoFlow, firstDefined]);

    const mergeGastoEstadoByFlow = useCallback((gasto) => {
        const backendEstado = normalizeEstadoFlow(
            firstDefined(
                gasto?.estadoActual,
                gasto?.estadoactual,
                gasto?.EstadoActual,
                ""
            )
        );

        if (backendEstado) {
            return { ...gasto, estado: backendEstado, estadoActual: backendEstado };
        }

        const fallbackEstado = backendEstado || "PENDIENTE";
        return { ...gasto, estado: fallbackEstado, estadoActual: fallbackEstado };
    }, [firstDefined, normalizeEstadoFlow]);

    const hasMeaningfulChanges = (prevList, nextList) => {
        if (!Array.isArray(prevList) || !Array.isArray(nextList)) return true;
        if (prevList.length !== nextList.length) return true;

        for (let i = 0; i < nextList.length; i += 1) {
            const prev = prevList[i] || {};
            const next = nextList[i] || {};
            const prevKey = String(prev.id ?? prev.idrend ?? i);
            const nextKey = String(next.id ?? next.idrend ?? i);
            if (prevKey !== nextKey) return true;
            if (String(prev.estado ?? "") !== String(next.estado ?? "")) return true;
            if (String(prev.estadoActual ?? "") !== String(next.estadoActual ?? "")) return true;
            if (String(prev.categoria ?? "") !== String(next.categoria ?? "")) return true;
            if (String(prev.idCategoria ?? prev.idcategoria ?? "") !== String(next.idCategoria ?? next.idcategoria ?? "")) return true;
            if (String(prev.tipogasto ?? "") !== String(next.tipogasto ?? "")) return true;
        }

        return false;
    };

    const fetchGastos = useCallback(async ({ silent = false, force = false } = {}) => {
        if (isFetchingRef.current) {
            if (force) pendingForceRefreshRef.current = true;
            return;
        }

        const requestSequence = fetchSequenceRef.current + 1;
        fetchSequenceRef.current = requestSequence;

        const now = Date.now();
        if (!force && now - lastFetchAtRef.current < 1200) return;

        isFetchingRef.current = true;
        lastFetchAtRef.current = now;

        if (!silent) {
            setLoadingGastos(true);
        }

        try {
            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");

            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            /* console.log("👤 USER COMPLETO:", userData);
            console.log("🏢 EMPRESA ACTUAL:", companyData); */

            if (!userData || !companyData) {
                throw new Error("Falta usuario o empresa");
            }

            const resolvedUserId = String(firstDefined(userData?.usecod, userData?.id, userData?.idUser, ""));
            const resolvedRuc = String(firstDefined(companyData?.ruc, companyData?.RUC, companyData?.numRuc, ""));

            if (!resolvedUserId || !resolvedRuc) {
                throw new Error("No se pudo resolver user/ruc para listar gastos");
            }

            const data = await getListaGastos({
                id: "1",
                idrend: "1",
                user: resolvedUserId,
                ruc: resolvedRuc,
            });
            /* 
                        console.log("📌 RUC ENVIADO:", companyData.ruc);
                        console.log("📥 GASTOS:", data); */

            const merged = (Array.isArray(data) ? data : []).map((g) => mergeGastoEstadoByFlow(g));

            // Ignora respuestas antiguas para evitar que un fetch atrasado pise estados recientes.
            if (requestSequence < fetchSequenceRef.current) {
                /* console.log("⏭️ Respuesta descartada por desactualizada:", requestSequence); */
                return;
            }

            setGastos((prev) => (hasMeaningfulChanges(prev, merged) ? merged : prev));
        } catch (error) {
            console.error("❌ Error cargando gastos:", error.message);
        } finally {
            if (!silent) {
                setLoadingGastos(false);
            }
            isFetchingRef.current = false;

            if (pendingForceRefreshRef.current) {
                pendingForceRefreshRef.current = false;
                fetchGastos({ silent: true, force: true });
            }
        }
    }, [firstDefined, mergeGastoEstadoByFlow]);

    useEffect(() => {
        fetchGastos({ force: true });
    }, [fetchGastos]);

    useEffect(() => {
        const onFocus = () => fetchGastos({ silent: true });
        const onCompanyChanged = () => fetchGastos({ silent: true, force: true });
        const onInformeUpdated = () => fetchGastos({ silent: true, force: true });
        const onAuditoriaUpdated = () => fetchGastos({ silent: true, force: true });
        const onRevisionUpdated = (event) => {
            // Si es DESAPROBADO, NO usar silent para mostrar cambios inmediatamente
            const isDesaprobado = event?.detail?.decision === "RECHAZADO";
            /*    console.log("📢 revision:updated evento:", { 
                   isDesaprobado, 
                   detail: event?.detail
               }); */
            fetchGastos({ silent: !isDesaprobado, force: true });
        };

        window.addEventListener("focus", onFocus);
        window.addEventListener("company:changed", onCompanyChanged);
        window.addEventListener("informe:updated", onInformeUpdated);
        window.addEventListener("auditoria:updated", onAuditoriaUpdated);
        window.addEventListener("revision:updated", onRevisionUpdated);

        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("company:changed", onCompanyChanged);
            window.removeEventListener("informe:updated", onInformeUpdated);
            window.removeEventListener("auditoria:updated", onAuditoriaUpdated);
            window.removeEventListener("revision:updated", onRevisionUpdated);
        };
    }, [fetchGastos]);

    const openCreateModal = async () => {
        setError(null);

        if (politicas.length === 0) {
            setLoading(true);
            try {
                const opciones = await getDropdownOptionsPolitica("politicas");
                setPoliticas(opciones);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedPolitica(null);
    };

    const handlePoliticaChange = (e) => {
        const politicaId = e.target.value;
        const politica = politicas.find((p) => String(p.id) === String(politicaId)) || null;
        setSelectedPolitica(politica);
    };

    const getEstadoStyle = (estado = "") => {
        return getWorkflowStatusBadgeClass(estado, true);
    };

    const handlePreview = (gasto) => {
        setPreviewGasto(gasto);
    };

    const closePreview = () => {
        setPreviewGasto(null);
    };

    const handleEdit = (gasto) => {
        setEditGasto(gasto);
    };

    const closeEditModal = () => {
        setEditGasto(null);
    };

    const handleEditSaved = async (updatedGasto) => {
        if (!updatedGasto) return;

        const updatedId = String(
            updatedGasto?.idRend ??
            updatedGasto?.idrend ??
            updatedGasto?.id ??
            ""
        );

        const mergedGasto = {
            ...updatedGasto,
            evidenciaPath: String(
                updatedGasto?.evidenciaPath ??
                updatedGasto?.obs ??
                ""
            ).trim(),
            evidenciaFileName: String(
                updatedGasto?.evidenciaFileName ??
                updatedGasto?.fileName ??
                updatedGasto?.nombreArchivo ??
                updatedGasto?.archivo ??
                ""
            ).trim(),
            evidenciaUpdatedAt: String(updatedGasto?.evidenciaUpdatedAt || updatedGasto?.updatedAt || Date.now()),
            updatedAt: String(updatedGasto?.updatedAt || updatedGasto?.evidenciaUpdatedAt || Date.now()),
        };

        setGastos((prev) => prev.map((item) => {
            const itemId = String(item?.idRend ?? item?.idrend ?? item?.id ?? "");
            return itemId && updatedId && itemId === updatedId ? { ...item, ...mergedGasto } : item;
        }));

        setPreviewGasto((prev) => {
            if (!prev) return prev;
            const previewId = String(prev?.idRend ?? prev?.idrend ?? prev?.id ?? "");
            return previewId && updatedId && previewId === updatedId ? { ...prev, ...mergedGasto } : prev;
        });

        setEditGasto((prev) => {
            if (!prev) return prev;
            const editId = String(prev?.idRend ?? prev?.idrend ?? prev?.id ?? "");
            return editId && updatedId && editId === updatedId ? { ...prev, ...mergedGasto } : prev;
        });
    };

    const toggleExportMode = () => {
        setIsExportMode((prev) => {
            if (prev) {
                setSelectedGastoIds([]);
            }
            return !prev;
        });
    };

    const toggleGastoSelection = (gasto) => {
        const gastoId = getGastoSelectionId(gasto);
        setSelectedGastoIds((prev) => (
            prev.includes(gastoId)
                ? prev.filter((id) => id !== gastoId)
                : [...prev, gastoId]
        ));
    };

    const toggleSelectAllFiltered = () => {
        const filteredIds = gastosFiltrados.map((gasto) => getGastoSelectionId(gasto));
        const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedGastoIds.includes(id));

        if (allSelected) {
            setSelectedGastoIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
            return;
        }

        setSelectedGastoIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    };

    const exportSelectedGastos = () => {
        const selectedGastos = gastos.filter((gasto) => selectedGastoIds.includes(getGastoSelectionId(gasto)));

        if (selectedGastos.length === 0) {
            window.alert("Selecciona al menos un gasto para exportar.");
            return;
        }

        const delimiter = ";";
        const columns = [
            {
                header: "ID Rendición",
                getValue: (gasto) => getGastoIdRend(gasto),
            },
            {
                header: "Política",
                getValue: (gasto) => gasto?.politica ?? "",
            },
            {
                header: "Categoría",
                getValue: (gasto) => gasto?.categoria ?? "",
            },
            {
                header: "Tipo de gasto",
                getValue: (gasto) => gasto?.tipogasto ?? "",
            },
            {
                header: "Proveedor",
                getValue: (gasto) => gasto?.proveedor ?? "",
            },
            {
                header: "Total",
                getValue: (gasto) => gasto?.total ?? "",
            },
            {
                header: "Moneda",
                getValue: (gasto) => gasto?.moneda ?? "",
            },
            {
                header: "Estado",
                getValue: (gasto) => normalizeEstadoLabel(gasto?.estado ?? ""),
            },
            {
                header: "Fecha",
                getValue: (gasto) => gasto?.fecha?.split("T")[0] || "",
            },
            {
                header: "Días",
                getValue: (gasto) => getDiasTranscurridos(gasto),
            },
            {
                header: "Glosa",
                getValue: (gasto) => getGlosaOrNota(gasto),
            },
        ];

        const escapeCsvCell = (value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replaceAll('"', '""')}"`;
        };

        const headerLine = columns
            .map((column) => escapeCsvCell(column.header))
            .join(delimiter);

        const lines = selectedGastos.map((gasto) => columns
            .map((column) => escapeCsvCell(column.getValue(gasto)))
            .join(delimiter));

        const csvContent = [headerLine, ...lines].join("\r\n");
        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const date = new Date();
        const pad = (num) => String(num).padStart(2, "0");
        const fileName = `gastos_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.csv`;

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsExportMode(false);
        setSelectedGastoIds([]);
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const gastosFiltrados = gastos.filter((gasto) => {
        if (!normalizedSearch) return true;

        const searchableFields = [
            gasto.politica,
            gasto.categoria,
            gasto.tipogasto,
            gasto.proveedor,
            String(gasto.total ?? ""),
            gasto.fecha?.split("T")[0] || "",
            String(getDiasTranscurridos(gasto)),
            gasto.estado,
            getGlosaOrNota(gasto),

        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableFields.includes(normalizedSearch);
    });

    const totalPages = Math.max(1, Math.ceil(gastosFiltrados.length / pageSize));
    const pageStart = (currentPage - 1) * pageSize;
    const gastosPaginados = gastosFiltrados.slice(pageStart, pageStart + pageSize);
    const currentFrom = gastosFiltrados.length > 0 ? pageStart + 1 : 0;
    const currentTo = Math.min(pageStart + pageSize, gastosFiltrados.length);
    const selectedInFilterCount = gastosFiltrados.filter((gasto) => selectedGastoIds.includes(getGastoSelectionId(gasto))).length;
    const allFilteredSelected = gastosFiltrados.length > 0 && selectedInFilterCount === gastosFiltrados.length;
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // Ajusta estos porcentajes para reducir/ensanchar columnas del modo tabla (desktop).
    const desktopColumnWidths = {
        seleccion: "4%",
        proveedor: "20%",
        categoria: "11%",
        tipoGasto: "10%",
        total: "4%",
        moneda: "6%",
        estado: "9%",
        fecha: "8%",
        dias: "4%",
        evidencia: "7%",
        acciones: "10%",
    };

    return (
        <div className="mx-auto w-full space-y-1 px-2 sm:px-4 lg:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-linear-to-br from-white via-slate-50 to-blue-50 p-2  shadow-sm">

                {/* DECORACIÓN SUTIL */}
                <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-blue-200/30 blur-2xl"></div>

                <div className="flex items-center justify-between gap-2">

                    {/* TEXTO */}
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-semibold text-slate-800 sm:text-xl">
                            Gestión de gastos
                        </h1>
                    </div>

                    {/* BOTÓN */}
                    <button
                        type="button"
                        onClick={openCreateModal}
                        disabled={loading}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-800 active:scale-95 disabled:opacity-60 cursor-po"
                    >
                        {loading ? (
                            <>
                                ⏳
                                Cargando
                            </>
                        ) : (
                            <>
                                ＋
                                Nuevo
                            </>
                        )}
                    </button>

                </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2">
                {/*  <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Lista de gastos</h2>
                    <p className="text-xs text-slate-500 sm:text-sm">
                        Mostrando {currentFrom}-{currentTo} de {gastosFiltrados.length} (total {gastos.length})
                    </p>
                </div> */}
                <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por política, categoría, tipo de gasto, proveedor, total, fecha, estado o glosa"
                        className="min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                    <button
                        type="button"
                        title="Limpiar búsqueda"
                        onClick={() => setSearchTerm("")}
                        className="shrink-0 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                    >
                        <IconBroom className="h-5 w-5" />
                    </button>

                    <ExportGastosToolbar
                        isExportMode={isExportMode}
                        selectedCount={selectedGastoIds.length}
                        onExportClick={isExportMode ? exportSelectedGastos : toggleExportMode}
                        onCancelClick={toggleExportMode}
                    />
                </div>

                <ExportGastosSummary
                    isExportMode={isExportMode}
                    selectedCount={selectedGastoIds.length}
                />

                {loadingGastos && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                        Cargando gastos...
                    </div>
                )}

                {!loadingGastos && gastosFiltrados.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No se encontraron resultados con ese criterio de búsqueda.
                    </div>
                )}

                {!loadingGastos && gastosFiltrados.length > 0 && (
                    <>
                        <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm 2xl:block">
                            <div className="max-h-[71vh] overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                <table className="w-full table-fixed border-separate border-spacing-0 bg-white">
                                    <colgroup>
                                        {isExportMode && <col style={{ width: desktopColumnWidths.seleccion }} />}
                                        <col style={{ width: desktopColumnWidths.proveedor }} />
                                        <col style={{ width: desktopColumnWidths.categoria }} />
                                        <col style={{ width: desktopColumnWidths.tipoGasto }} />
                                        <col style={{ width: desktopColumnWidths.total }} />
                                        <col style={{ width: desktopColumnWidths.moneda }} />
                                        <col style={{ width: desktopColumnWidths.estado }} />
                                        <col style={{ width: desktopColumnWidths.fecha }} />
                                        <col style={{ width: desktopColumnWidths.dias }} />
                                        <col style={{ width: desktopColumnWidths.evidencia }} />
                                        <col style={{ width: desktopColumnWidths.acciones }} />
                                    </colgroup>
                                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                                        <tr>

                                            {isExportMode && (
                                                <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={allFilteredSelected}
                                                        onChange={toggleSelectAllFiltered}
                                                        title="Seleccionar todos los filtrados"
                                                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                                                    />
                                                </th>
                                            )}

                                            <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Proveedor</th>
                                            <th className="border-b border-slate-200 px-1 py-1  text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Categoría</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Tipo de gasto</th>
                                            <th className="border-b border-slate-200 px-1 py-1  text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Total</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Moneda</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Estado</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Fecha</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Días</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Evidencia</th>
                                            <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Acciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {gastosPaginados.map((gasto, index) => (
                                            <tr key={gasto.id || index} className={`odd:bg-white even:bg-slate-50/50 transition hover:bg-blue-50/60 ${selectedGastoIds.includes(getGastoSelectionId(gasto)) ? "ring-1 ring-emerald-200" : ""}`}>

                                                {isExportMode && (
                                                    <td className="border-b border-slate-100 px-2 py-1 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedGastoIds.includes(getGastoSelectionId(gasto))}
                                                            onChange={() => toggleGastoSelection(gasto)}
                                                            title="Seleccionar gasto"
                                                            className="h-4 w-4 cursor-pointer accent-emerald-600"
                                                        />
                                                    </td>
                                                )}

                                                <td className="border-b border-slate-100 px-2 py-1 text-left text-sm font-semibold text-slate-800">
                                                    <p className="truncate" title={gasto.ruc || "-"}>{gasto.proveedor || gasto.ruc || gasto.ruccliente || "-"}</p>
                                                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500" title={getGlosaOrNota(gasto) || "-"}>
                                                        {getGlosaOrNota(gasto) || "-"}
                                                    </p>
                                                </td>
                                                <td className="border-b border-slate-100 py-1 text-center text-sm text-slate-700">
                                                    <p className="truncate" title={gasto.categoria || "-"}>{gasto.categoria || "-"}</p>
                                                </td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    <p className="truncate" title={gasto.tipogasto || "-"}>{gasto.tipogasto || "-"}</p>
                                                </td>

                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-bold text-slate-800">{gasto.total ?? "-"}</td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    {gasto.moneda || "-"}
                                                </td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoStyle(gasto.estado)}`}>
                                                        {normalizeEstadoLabel(gasto.estado || "Sin estado")}
                                                    </span>
                                                </td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    {gasto.fecha?.split("T")[0] || "-"}
                                                </td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    {getDiasTranscurridos(gasto)}
                                                </td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    <EvidenciaImagen
                                                        key={`${gasto.id || gasto.idrend || gasto.evidenciaPath || gasto.evidenciaFileName || index}`}
                                                        gasto={gasto}
                                                        alt="Evidencia"
                                                        className="mx-auto h-11 w-11 rounded-lg border border-slate-200 object-cover shadow-xs"
                                                        fallback="-"
                                                    />
                                                </td>
                                                <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePreview(gasto)}
                                                            title="Vista previa"
                                                            aria-label="Vista previa"
                                                            className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition hover:scale-105 hover:bg-blue-100 cursor-pointer"
                                                        >
                                                            <IconEye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(gasto)}
                                                            title="Editar"
                                                            aria-label="Editar"
                                                            disabled={!isGastoEditable(gasto)}
                                                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:scale-105 hover:border-blue-300 hover:bg-blue-50 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                                        >
                                                            <IconEdit className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                        <div className="grid grid-cols-1 gap-1.5 2xl:hidden">
                            {gastosPaginados.map((gasto, index) => (
                                <article key={gasto.id || index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                                    <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-blue-50/60 px-2.5 py-0.5 sm:px-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                {/*CHECAR EL PROVEDOR*/}
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-black" title={gasto.proveedor || gasto.ruc}>{gasto.proveedor || gasto.rucEmisor || gasto.rucemisor || gasto.ruc}</p>
                                                <div className="mt-0.5 flex items-center gap-0.5">
                                                    <IconEtiqueta className="h-3.5 w-3.5 shrink-0" />
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700" title={gasto.categoria || "-"}>
                                                        {gasto.categoria || "-"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {isExportMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGastoIds.includes(getGastoSelectionId(gasto))}
                                                        onChange={() => toggleGastoSelection(gasto)}
                                                        title="Seleccionar gasto"
                                                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handlePreview(gasto)}
                                                    title="Vista previa"
                                                    aria-label="Vista previa"
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 cursor-pointer"
                                                >
                                                    <IconEye className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(gasto)}
                                                    title="Editar"
                                                    aria-label="Editar"
                                                    disabled={!isGastoEditable(gasto)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                                >
                                                    <IconEdit className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">

                                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                {gasto.fecha?.split("T")[0] || "-"}
                                            </span>
                                            <span className="inline-flex rounded-full border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                                <p className=" text-red-800">{getDiasTranscurridos(gasto)} Días</p>
                                            </span>

                                            {/*TOTAL Y MONEDA */}
                                            <span className="inline-flex rounded-full border border-blue-400 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                                {gasto.total ?? "-"} {gasto.moneda || "-"}
                                            </span>

                                            {/*ESTADO HACIA LA DERECHA */}
                                            <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getEstadoStyle(gasto.estado)}`}>
                                                {normalizeEstadoLabel(gasto.estado || "Sin estado")}
                                            </span>

                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={gastosFiltrados.length}
                            currentFrom={currentFrom}
                            currentTo={currentTo}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                            pageSizeOptions={PAGE_SIZE_OPTIONS}
                        />
                    </>
                )}

                <ExportGastosBulkSelect
                    isExportMode={isExportMode}
                    hasItems={gastosFiltrados.length > 0}
                    allFilteredSelected={allFilteredSelected}
                    filteredCount={gastosFiltrados.length}
                    onToggleSelectAllFiltered={toggleSelectAllFiltered}
                />
            </div>

            {previewGasto && (
                <BaseModal
                    isOpen={Boolean(previewGasto)}
                    onClose={closePreview}
                    title="VISTA PREVIA"
                    maxWidthClass="max-w-2xl"
                    viewportClass="items-end p-2 sm:items-center sm:p-5"
                    panelClass="p-3 sm:p-6"
                >
                    <div className="space-y-3 sm:space-y-4">
                        <div className="rounded-2xl border border-blue-200/70 bg-linear-to-r from-blue-50 to-slate-50 p-3 sm:p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">

                                    <p className="mt-1 truncate text-sm font-bold text-slate-800 sm:text-base" title={previewGasto.ruc || "-"} > {previewGasto.proveedor || previewGasto.ruc || previewGasto.ruccliente || "-"}
                                    </p>
                                </div>
                                <div className="flex items-center justify-end gap-2 text-right">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        Total
                                    </p>

                                    <p className="text-base font-extrabold text-blue-900 sm:text-lg">
                                        {previewGasto.total ?? "-"}
                                    </p>

                                    <span className="text-base font-extrabold text-blue-900 sm:text-lg">
                                        {previewGasto.moneda || "-"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    ID Rendición: {getGastoIdRend(previewGasto) || "-"}
                                </span>
                                 <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getEstadoStyle(previewGasto.estado)}`}>
                                    {normalizeEstadoLabel(previewGasto.estado || "Sin estado")}
                                </span>
                                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                    {previewGasto.fecha?.split("T")[0] || "-"}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4 sm:gap-2.5">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Política</p>
                                <p className="mt-1 truncate font-semibold text-slate-700" title={previewGasto.politica || "-"}>{previewGasto.politica || "-"}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Categoría</p>
                                <p className="mt-1 truncate font-semibold text-slate-700" title={previewGasto.categoria || "-"}>{previewGasto.categoria || "-"}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">IGV</p>
                                <p className="mt-1 font-semibold text-slate-700">{previewGasto.igv ?? "-"}</p>
                            </div>
                         {/*    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID Rendición</p>
                                <p className="mt-1 truncate font-semibold text-slate-700" title={String(previewGasto?.idRend ?? previewGasto?.idrend ?? previewGasto?.id ?? "-")}>
                                    {previewGasto?.idRend ?? previewGasto?.idrend ?? previewGasto?.id ?? "-"}
                                </p>
                            </div> */}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Glosa</p>
                            <p className="text-sm leading-relaxed text-slate-700">{getGlosaOrNota(previewGasto) || "-"}</p>
                        </div>

                        {isMovilidadGasto(previewGasto) && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Datos de movilidad</p>
                                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                    {[
                                        ["LUGAR ORIGEN", firstDefined(previewGasto?.lugarOrigen, previewGasto?.lugarorigen, previewGasto?.origen, previewGasto?.puntoOrigen, previewGasto?.desde, "-")],
                                        ["LUGAR DESTINO", firstDefined(previewGasto?.lugarDestino, previewGasto?.lugardestino, previewGasto?.destino, previewGasto?.puntoDestino, previewGasto?.hasta, "-")],
                                        ["TIPO MOVILIDAD", firstDefined(previewGasto?.tipoMovilidad, previewGasto?.tipomovilidad, previewGasto?.tipo_movilidad, previewGasto?.movilidad, previewGasto?.transporte, previewGasto?.medioTransporte, previewGasto?.medio_transporte, "-")],
                                        ["MOTIVO VIAJE", firstDefined(previewGasto?.motivoViaje, previewGasto?.motivo_viaje, previewGasto?.motivo, previewGasto?.glosa, "-")],
                                        ["PLACA", firstDefined(previewGasto?.placa, previewGasto?.vehiculoPlaca, previewGasto?.placaVehiculo, previewGasto?.nroPlaca, "-")],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                                            <p className="mt-1 font-semibold text-slate-700">{value || "-"}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Evidencia</p>
                            <EvidenciaImagen
                                key={`${previewGasto?.id || previewGasto?.idrend || previewGasto?.evidenciaPath || previewGasto?.evidenciaFileName || "preview"}`}
                                gasto={previewGasto}
                                alt="Evidencia del gasto"
                                className="max-h-[56vh] w-full cursor-zoom-in rounded-lg border border-slate-200 object-contain bg-white transition hover:opacity-90"
                                onClick={(e) => setZoomSrc(e.currentTarget.src)}
                                fallback={<p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">No hay evidencia.</p>}
                            />
                        </div>
                    </div>
                </BaseModal>
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

                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                        {Math.round(zoomScale * 100)}%
                    </span>

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
                    />
                </div>
            )}

            <EditarGastoModal
                gasto={editGasto}
                isOpen={Boolean(editGasto)}
                onClose={closeEditModal}
                onSaved={handleEditSaved}
            />

            {showModal && (
                <BaseModal
                    isOpen={showModal}
                    onClose={closeModal}
                    title="Crear Nuevo Gasto"
                    maxWidthClass="max-w-6xl"
                    viewportClass="items-start overflow-auto p-4 sm:p-8"
                    panelClass="p-4 sm:p-6"
                >

                    {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="politica-select">
                            Seleccionar política
                        </label>
                        <select
                            id="politica-select"
                            value={selectedPolitica?.id || ""}
                            onChange={handlePoliticaChange}
                            className="w-full cursor-pointer rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">Selecciona una política</option>
                            {politicas.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white">
                        {selectedPolitica && (
                            <>
                                <h2 className="mb-3 text-lg font-bold text-slate-800">
                                    Política: {selectedPolitica.name}
                                </h2>

                                {String(selectedPolitica?.name ?? "").toLowerCase().includes("movilidad") ? (
                                    <GastoMovilidad selectedPolitica={selectedPolitica} />
                                ) : (
                                    <GastoGeneral selectedPolitica={selectedPolitica} />
                                )}
                            </>
                        )}

                        {!selectedPolitica && (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                Selecciona una política para mostrar el formulario.
                            </div>
                        )}
                    </div>
                </BaseModal>
            )}


        </div>
    );
}