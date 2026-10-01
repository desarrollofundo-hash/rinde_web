import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getDropdownOptionsPolitica } from "../../services/politica";
import GastoGeneral from "./FormGasto/GastoGeneral";
import GastoMovilidad from "./FormGasto/GastoMovilidad";
import { getListaGastos } from "../../services/listar/listar_gasto";
import { IconEye } from "../../Icons/preview";
import { IconEdit } from "../../Icons/edit";
import AnimatedList from "./AnimatedList";
import EditarGastoModal from "./EditarGastoModal";
import EvidenciaImagen from "./EvidenciaImagen";
import ImageZoomLightbox from "../ImagZoom/ImageZoomLightbox";
import PaginationControls from "./PaginationControls";
import { IconBroom } from "../../Icons/broom";
import { IconClose } from "../../Icons/close";
import EstadisticasIcon from "../../Icons/statistics";
import {
  ExportGastosToolbar,
  ExportGastosBulkSelect,
} from "./ExportGastosControls";
import { IconEtiqueta } from "../../Icons/etiqueta";
import Toast from "../shared/Toast";
import { getWorkflowStatusBadgeClass } from "../shared/workflowStatus";
import { FileText, Loader2, Plus, Save } from "lucide-react";
export default function CrearGasto() {
  const DEFAULT_PAGE_SIZE = 10;
  const PAGE_SIZE_STORAGE_KEY = "gasto.pageSize";
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
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
  const [toastConfig, setToastConfig] = useState({
    isVisible: false,
    message: "",
    type: "info",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });

  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && searchTerm) {
        setSearchTerm("");
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [searchTerm]);

  const [previewGasto, setPreviewGasto] = useState(null);
  const [editGasto, setEditGasto] = useState(null);
  const [zoomSrc, setZoomSrc] = useState(null);

  // ESTADOS PARA PREVIEW AL PASAR CURSOR (HOVER)
  // hoverEvidenceSrc: URL de la imagen a mostrar en el preview
  // hoverEvidencePos: Posición X,Y donde aparecerá el preview
  const [hoverEvidenceSrc, setHoverEvidenceSrc] = useState(null);
  const [hoverEvidencePos, setHoverEvidencePos] = useState({ x: 0, y: 0 });
  const modalRoot = typeof document !== "undefined" ? document.body : null;
  const isFetchingRef = useRef(false);
  const pendingForceRefreshRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const fetchSequenceRef = useRef(0);

  const firstDefined = useCallback((...values) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
    return "";
  }, []);

  const getGlosaOrNota = useCallback(
    (gasto) => firstDefined(gasto?.obs),
    [firstDefined],
  );

  const getTipoComprobante = useCallback(
    (gasto) => firstDefined(gasto?.tipocomprobante),
    [firstDefined],
  );

  const getGastoIdRend = useCallback(
    (gasto) => String(firstDefined(gasto?.idrend)),
    [firstDefined],
  );
  const getMotivoRechazo = useCallback(
    (gasto) => String(firstDefined(gasto?.motivorechazo, gasto?.rechazoRev)),
    [firstDefined],
  );
  const getGastoSelectionId = useCallback(
    (gasto) => {
      const explicitId = firstDefined(gasto?.idrend);
      if (explicitId) return String(explicitId);

      const fallback = [
        firstDefined(gasto?.proveedor, "sin-proveedor"),
        firstDefined(gasto?.fecha, "sin-fecha"),
        firstDefined(gasto?.total, "0"),
        firstDefined(gasto?.tipogasto, "sin-tipo"),
        firstDefined(gasto?.categoria, "sin-categoria"),
      ].join("|");

      return fallback;
    },
    [firstDefined],
  );

  const normalizeEstadoLabel = (estado) =>
    String(estado ?? "Sin estado").replaceAll("_", " ");

  const normalizeText = useCallback(
    (value) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase(),
    [],
  );

  const isMovilidadGasto = useCallback(
    (gasto) => {
      const categoriaRaw = normalizeText(firstDefined(gasto?.categoria));
      const tipoRaw = normalizeText(
        firstDefined(gasto?.tipogasto, gasto?.tipomovilidad),
      );
      const politicaRaw = normalizeText(firstDefined(gasto?.politica));
      const hasMovilidadFields = [
        gasto?.lugarorigen,
        gasto?.lugardestino,
        gasto?.tipomovilidad,
      ].some((value) => String(value ?? "").trim() !== "");

      const keywords = [
        "MOVILIDAD",
        "PLANILLA DE MOVILIDAD",
        "GASTOS DE MOVILIDAD",
      ];
      return (
        hasMovilidadFields ||
        [categoriaRaw, tipoRaw, politicaRaw].some((value) =>
          keywords.some((keyword) => value.includes(keyword)),
        )
      );
    },
    [firstDefined, normalizeText],
  );

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

    const factura = new Date(
      fechaFactura.getFullYear(),
      fechaFactura.getMonth(),
      fechaFactura.getDate(),
    );
    const registro = new Date(
      fechaRegistro.getFullYear(),
      fechaRegistro.getMonth(),
      fechaRegistro.getDate(),
    );
    const diffDays = Math.floor(
      (registro.getTime() - factura.getTime()) / (1000 * 60 * 60 * 24),
    );

    return diffDays >= 0 ? diffDays : 0;
  };

  const normalizeEstadoFlow = useCallback((rawEstado) => {
    const value = String(rawEstado ?? "")
      .trim()
      .toUpperCase()
      .replaceAll("_", " ");
    if (!value) return "";
    if (value === "S" || value === "N") return "";
    if (value.includes("DESAPROB") || value.includes("RECHAZ"))
      return "RECHAZADO";
    if (value.includes("APROB")) return "APROBADO";
    if (value.includes("REVISION")) return "EN REVISION";
    if (value.includes("AUDITORIA")) return "EN AUDITORIA";
    if (value.includes("INFORME")) return "EN INFORME";
    if (value.includes("BORRADOR")) return "BORRADOR";
    if (value.includes("PENDIENTE")) return "PENDIENTE";
    return value;
  }, []);

  const isGastoEditable = useCallback(
    (gasto) => {
      const estado = normalizeEstadoFlow(firstDefined(gasto?.estadoActual, ""));
      return estado === "BORRADOR";
    },
    [normalizeEstadoFlow, firstDefined],
  );

  const mergeGastoEstadoByFlow = useCallback(
    (gasto) => {
      const backendEstado = normalizeEstadoFlow(
        firstDefined(gasto?.estadoActual, ""),
      );

      if (backendEstado) {
        return { ...gasto, estado: backendEstado, estadoActual: backendEstado };
      }

      const fallbackEstado = backendEstado || "PENDIENTE";
      return { ...gasto, estado: fallbackEstado, estadoActual: fallbackEstado };
    },
    [firstDefined, normalizeEstadoFlow],
  );

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
      if (String(prev.estadoActual ?? "") !== String(next.estadoActual ?? ""))
        return true;
      if (String(prev.categoria ?? "") !== String(next.categoria ?? ""))
        return true;
      if (
        String(prev.idCategoria ?? prev.idcategoria ?? "") !==
        String(next.idCategoria ?? next.idcategoria ?? "")
      )
        return true;
      if (String(prev.tipogasto ?? "") !== String(next.tipogasto ?? ""))
        return true;
    }

    return false;
  };

  const fetchGastos = useCallback(
    async ({ silent = false, force = false } = {}) => {
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
                    console.log("🏢 EMPRESA ACTUAL:", companyData);  */

        if (!userData || !companyData) {
          throw new Error("Falta usuario o empresa");
        }

        const resolvedUserId = String(
          firstDefined(userData?.usecod, userData?.id, userData?.idUser, ""),
        );
        const resolvedRuc = String(firstDefined(companyData?.ruc, ""));

        if (!resolvedUserId || !resolvedRuc) {
          throw new Error("No se pudo resolver user/ruc para listar gastos");
        }

        const data = await getListaGastos({
          id: "1",
          idrend: "1",
          user: resolvedUserId,
          ruc: resolvedRuc,
        });

        /*         console.log("📌 RUC ENVIADO:", companyData.ruc);
                                console.log("📥 GASTOS:", data); */

        const merged = (Array.isArray(data) ? data : []).map((g) =>
          mergeGastoEstadoByFlow(g),
        );

        // Ignora respuestas antiguas para evitar que un fetch atrasado pise estados recientes.
        if (requestSequence < fetchSequenceRef.current) {
          /* console.log("⏭️ Respuesta descartada por desactualizada:", requestSequence); */
          return;
        }

        setGastos((prev) =>
          hasMeaningfulChanges(prev, merged) ? merged : prev,
        );
      } catch (error) {
        /*    console.error("❌ Error cargando gastos:", error.message); */
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
    },
    [firstDefined, mergeGastoEstadoByFlow],
  );

  useEffect(() => {
    fetchGastos({ force: true });
  }, [fetchGastos]);

  useEffect(() => {
    let companyChangeTimeoutId;

    const onFocus = () => fetchGastos({ silent: true });
    const onCompanyChanged = () => {
      // Agregar pequeño delay para evitar bloqueos de UI
      companyChangeTimeoutId = setTimeout(() => {
        fetchGastos({ silent: true, force: true });
      }, 150);
    };
    const onInformeUpdated = () => fetchGastos({ silent: true, force: true });
    const onAuditoriaUpdated = () => fetchGastos({ silent: true, force: true });
    // Al crear/guardar un gasto (formulario o escáner OCR) se dispara este
    // evento para refrescar la lista sin recargar la página.
    const onGastoUpdated = () => fetchGastos({ silent: true, force: true });
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
    window.addEventListener("gasto:updated", onGastoUpdated);

    return () => {
      clearTimeout(companyChangeTimeoutId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("company:changed", onCompanyChanged);
      window.removeEventListener("informe:updated", onInformeUpdated);
      window.removeEventListener("auditoria:updated", onAuditoriaUpdated);
      window.removeEventListener("revision:updated", onRevisionUpdated);
      window.removeEventListener("gasto:updated", onGastoUpdated);
    };
  }, [fetchGastos]);

  const openCreateModal = async () => {
    setError(null);

    // Cargar políticas solo si aún no están cargadas
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

  useEffect(() => {
    const isAnyOpen = Boolean(previewGasto) || showModal;
    if (!isAnyOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (previewGasto) setPreviewGasto(null);
        else if (showModal) {
          setShowModal(false);
          setSelectedPolitica(null);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewGasto, showModal]);

  useEffect(() => {
    if (!showModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal]);

  const handlePoliticaChange = (e) => {
    const politicaId = e.target.value;
    const politica =
      politicas.find((p) => String(p.id) === String(politicaId)) || null;
    setSelectedPolitica(politica);
  };

  // Movilidad tiene su propio formulario; el resto usa el de gastos generales.
  const esPoliticaMovilidad = (politica) =>
    String(politica?.name ?? "")
      .toLowerCase()
      .includes("movilidad");

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

  // FUNCIÓN: Mostrar preview al pasar cursor sobre evidencia
  // e: evento del mouse
  // imageSrc: URL de la imagen a mostrar
  // Obtiene la posición X,Y de donde está la imagen pequeña para posicionar el preview
  const handleEvidenceMouseEnter = (e, imageSrc) => {
    if (!imageSrc) return;
    const rect = e.currentTarget.getBoundingClientRect(); // Posición de la imagen
    setHoverEvidenceSrc(imageSrc); // Guardar URL de la imagen
    setHoverEvidencePos({
      x: rect.left, // Posición horizontal (izquierda)
      y: rect.top, // Posición vertical (arriba)
    });
  };

  // FUNCIÓN: Ocultar preview cuando el cursor sale de la imagen
  const handleEvidenceMouseLeave = () => {
    setHoverEvidenceSrc(null);
  };

  const handleEditSaved = async (updatedGasto) => {
    if (!updatedGasto) return;

    const updatedId = String(
      updatedGasto?.idRend ?? updatedGasto?.idrend ?? updatedGasto?.id ?? "",
    );

    const mergedGasto = {
      ...updatedGasto,
      evidenciaPath: String(
        updatedGasto?.evidenciaPath ?? updatedGasto?.obs ?? "",
      ).trim(),
      evidenciaFileName: String(
        updatedGasto?.evidenciaFileName ??
          updatedGasto?.fileName ??
          updatedGasto?.nombreArchivo ??
          updatedGasto?.archivo ??
          "",
      ).trim(),
      evidenciaUpdatedAt: String(
        updatedGasto?.evidenciaUpdatedAt ||
          updatedGasto?.updatedAt ||
          Date.now(),
      ),
      updatedAt: String(
        updatedGasto?.updatedAt ||
          updatedGasto?.evidenciaUpdatedAt ||
          Date.now(),
      ),
    };

    setGastos((prev) =>
      prev.map((item) => {
        const itemId = String(item?.idRend ?? item?.idrend ?? item?.id ?? "");
        return itemId && updatedId && itemId === updatedId
          ? { ...item, ...mergedGasto }
          : item;
      }),
    );

    setPreviewGasto((prev) => {
      if (!prev) return prev;
      const previewId = String(prev?.idrend ?? "");
      return previewId && updatedId && previewId === updatedId
        ? { ...prev, ...mergedGasto }
        : prev;
    });

    setEditGasto((prev) => {
      if (!prev) return prev;
      const editId = String(prev?.idrend ?? "");
      return editId && updatedId && editId === updatedId
        ? { ...prev, ...mergedGasto }
        : prev;
    });

    // Revalida contra el servidor para confirmar que los campos editados (ruc, proveedor, glosa, etc.)
    // realmente quedaron persistidos y no solo reflejados en el merge local.
    fetchGastos({ silent: true, force: true });
  };

  const toggleExportMode = () => {
    setIsExportMode((prev) => {
      if (prev) {
        setSelectedGastoIds([]);
        setToastConfig((current) => ({ ...current, isVisible: false }));
        return !prev;
      }

      setToastConfig({
        isVisible: true,
        message: "Ya puedes marcar los gastos que deseas exportar.",
        type: "info",
      });

      return !prev;
    });
  };

  const closeToast = () => {
    setToastConfig((prev) => ({ ...prev, isVisible: false }));
  };

  const toggleGastoSelection = (gasto) => {
    const gastoId = getGastoSelectionId(gasto);
    setSelectedGastoIds((prev) =>
      prev.includes(gastoId)
        ? prev.filter((id) => id !== gastoId)
        : [...prev, gastoId],
    );
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = gastosFiltrados.map((gasto) =>
      getGastoSelectionId(gasto),
    );
    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedGastoIds.includes(id));

    if (allSelected) {
      setSelectedGastoIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
      return;
    }

    setSelectedGastoIds((prev) =>
      Array.from(new Set([...prev, ...filteredIds])),
    );
  };

  const exportSelectedGastos = () => {
    const selectedGastos = gastos.filter((gasto) =>
      selectedGastoIds.includes(getGastoSelectionId(gasto)),
    );

    if (selectedGastos.length === 0) {
      window.alert("Selecciona al menos un gasto para exportar.");
      return;
    }

    const delimiter = ";";
    const columns = [
      { header: "ID Rendición", getValue: (gasto) => getGastoIdRend(gasto) },
      { header: "Política", getValue: (gasto) => gasto?.politica ?? "" },
      { header: "Categoría", getValue: (gasto) => gasto?.categoria ?? "" },
      { header: "Tipo de gasto", getValue: (gasto) => gasto?.tipogasto ?? "" },
      { header: "Proveedor", getValue: (gasto) => gasto?.proveedor ?? "" },
      { header: "Total", getValue: (gasto) => gasto?.total ?? "" },
      { header: "Moneda", getValue: (gasto) => gasto?.moneda ?? "" },
      {
        header: "Estado",
        getValue: (gasto) => normalizeEstadoLabel(gasto?.estado ?? ""),
      },
      {
        header: "Fecha",
        getValue: (gasto) => gasto?.fecha?.split("T")[0] || "",
      },
      { header: "Días", getValue: (gasto) => getDiasTranscurridos(gasto) },
      { header: "Glosa", getValue: (gasto) => getGlosaOrNota(gasto) },
    ];

    const escapeCsvCell = (value) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replaceAll('"', '""')}"`;
    };

    const headerLine = columns
      .map((column) => escapeCsvCell(column.header))
      .join(delimiter);

    const lines = selectedGastos.map((gasto) =>
      columns
        .map((column) => escapeCsvCell(column.getValue(gasto)))
        .join(delimiter),
    );

    const csvContent = [headerLine, ...lines].join("\r\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
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
      gasto.moneda,
      gasto.idrend,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableFields.includes(normalizedSearch);
  });

  const totalPages = Math.max(1, Math.ceil(gastosFiltrados.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const gastosPaginados = gastosFiltrados.slice(
    pageStart,
    pageStart + pageSize,
  );
  const currentFrom = gastosFiltrados.length > 0 ? pageStart + 1 : 0;
  const currentTo = Math.min(pageStart + pageSize, gastosFiltrados.length);
  const selectedInFilterCount = gastosFiltrados.filter((gasto) =>
    selectedGastoIds.includes(getGastoSelectionId(gasto)),
  ).length;
  const allFilteredSelected =
    gastosFiltrados.length > 0 &&
    selectedInFilterCount === gastosFiltrados.length;
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
    seleccion: "3%",
    id: "4%",
    proveedor: "16%",
    categoria: "10%",
    tipoGasto: "9%",
    total: "5%",
    moneda: "5%",
    estado: "10%",
    fecha: "7%",
    dias: "4%",
    evidencia: "6%",
    acciones: "7%",
  };

  return (
    <>
      <div className="mx-auto flex h-full w-full flex-col px-2 sm:px-4 lg:px-6">
        {/* ── TOOLBAR: título + buscador + acciones ── */}
        <div className="shrink-0 flex items-center gap-2.5 border-b border-slate-200 py-2.5">
          {/* Icono + título */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
              <EstadisticasIcon className="w-5 h-5 text-sky-500" />
            </div>
            <div className="hidden sm:block leading-tight">
              <h1 className="text-sm font-bold text-slate-800">Gastos</h1>
              <p className="text-[11px] text-slate-400">
                Gestiona tus rendiciones
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-200 shrink-0" />

          {/* Buscador */}
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, política, categoría, estado..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition duration-200 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 hover:border-slate-400"
              aria-label="Campo de búsqueda de gastos"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
                aria-label="Limpiar búsqueda"
                title="Limpiar (Esc)"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Export */}
          <ExportGastosToolbar
            isExportMode={isExportMode}
            selectedCount={selectedGastoIds.length}
            onExportClick={
              isExportMode ? exportSelectedGastos : toggleExportMode
            }
            onCancelClick={toggleExportMode}
          />

          {/* Nuevo */}
          <button
            type="button"
            onClick={openCreateModal}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {loading ? "Cargando" : "Nuevo"}
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col py-2">
          {loadingGastos && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 justify-center mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span>Cargando gastos...</span>
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}

          {!loadingGastos && gastosFiltrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-700 font-semibold text-lg">
                No hay gastos registrados
              </p>
              <p className="text-sm text-gray-500 mt-2 mb-6">
                Empieza registrando tu primer gasto
              </p>
              <button
                onClick={openCreateModal}
                disabled={loading}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear primer gasto
              </button>
            </div>
          )}

          {!loadingGastos && gastosFiltrados.length > 0 && (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex flex-1 min-h-0 xl:flex-col">
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full table-fixed border-separate border-spacing-0 bg-white">
                    <colgroup>
                      {isExportMode && (
                        <col style={{ width: desktopColumnWidths.seleccion }} />
                      )}
                      <col style={{ width: desktopColumnWidths.id }} />
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
                        <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          ID
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Proveedor
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1  text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Categoría
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Tipo de gasto
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1  text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Total
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Moneda
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Estado
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Fecha
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Días
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Evidencia
                        </th>
                        <th className="border-b border-slate-200 px-1 py-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {gastosPaginados.map((gasto, index) => (
                        <tr
                          key={gasto.id || index}
                          className={`odd:bg-white even:bg-slate-50/50 transition-all duration-150 hover:bg-sky-50/60 ${selectedGastoIds.includes(getGastoSelectionId(gasto)) ? "ring-1 ring-emerald-200" : ""}`}
                        >
                          {isExportMode && (
                            <td className="border-b border-slate-100 px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={selectedGastoIds.includes(
                                  getGastoSelectionId(gasto),
                                )}
                                onChange={() => toggleGastoSelection(gasto)}
                                title="Seleccionar gasto"
                                className="h-4 w-4 cursor-pointer accent-emerald-600"
                              />
                            </td>
                          )}
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-800">
                            {gasto.idrend ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-left">
                            <p className="truncate text-sm font-semibold leading-tight text-slate-800" title={gasto.proveedor || gasto.ruc || gasto.ruccliente || "-"}>
                              {gasto.proveedor || gasto.ruc || gasto.ruccliente || "-"}
                            </p>
                            {getGlosaOrNota(gasto) && (
                              <p className="truncate text-[10px] leading-tight text-slate-400" title={getGlosaOrNota(gasto)}>
                                {getGlosaOrNota(gasto)}
                              </p>
                            )}
                          </td>
                          <td className="border-b border-slate-100 py-1 text-center text-sm text-slate-700">
                            <p
                              className="truncate"
                              title={gasto.categoria || "-"}
                            >
                              {gasto.categoria || "-"}
                            </p>
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                            <p
                              className="truncate"
                              title={gasto.tipogasto || "-"}
                            >
                              {gasto.tipogasto || "-"}
                            </p>
                          </td>

                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm font-bold text-slate-800">
                            {gasto.total ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                            {gasto.moneda || "-"}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoStyle(gasto.estado)}`}
                            >
                              {normalizeEstadoLabel(
                                gasto.estado || "Sin estado",
                              )}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                            {gasto.fecha?.split("T")[0] || "-"}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                            {getDiasTranscurridos(gasto)}
                          </td>
                          {/* CELDA DE EVIDENCIA EN TABLA - Con preview al hover */}
                          <td className="border-b border-slate-100 px-2 py-1 text-center text-sm text-slate-700">
                            <div className="relative inline-block">
                              <EvidenciaImagen
                                key={`${gasto.id || gasto.idrend || gasto.evidenciaPath || gasto.evidenciaFileName || index}`}
                                gasto={gasto}
                                alt="Evidencia"
                                className="mx-auto h-8 w-8 rounded-md border border-slate-200 object-cover shadow-xs cursor-zoom-in hover:opacity-80 transition"
                                fallback="-"
                                // EVENTO: Al pasar cursor, muestra preview grande
                                onMouseEnter={(e) => {
                                  const img = e.currentTarget;
                                  if (
                                    img.src &&
                                    !img.src.endsWith("undefined") &&
                                    img.src !== ""
                                  ) {
                                    handleEvidenceMouseEnter(e, img.src);
                                  }
                                }}
                                // EVENTO: Al salir cursor, oculta preview
                                onMouseLeave={handleEvidenceMouseLeave}
                                // EVENTO: Al hacer clic, abre zoom completo
                                onClick={(e) => setZoomSrc(e.currentTarget.src)}
                              />
                            </div>
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
                <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
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
                </div>
              </div>

              <div className="xl:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
                  <AnimatedList
                    items={gastosPaginados}
                    onItemSelect={(gasto) => handlePreview(gasto)}
                    showGradients
                    enableArrowNavigation
                    displayScrollbar={false}
                    className="w-full"
                    getItemKey={(gasto, index) =>
                      String(gasto?.id || gasto?.idrend || index)
                    }
                    renderItem={(gasto) => (
                      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <div className="flex items-start justify-between gap-3">
                            {/* Info principal */}
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-sm font-semibold text-slate-800 truncate"
                                title={gasto.proveedor || gasto.ruc}
                              >
                                {gasto.proveedor ||
                                  gasto.rucEmisor ||
                                  gasto.rucemisor ||
                                  gasto.ruc ||
                                  "—"}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1">
                                <IconEtiqueta className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <p
                                  className="text-xs text-slate-500 truncate"
                                  title={gasto.categoria || "-"}
                                >
                                  {gasto.categoria || "-"}
                                </p>
                              </div>
                            </div>

                            {/* Acciones */}
                            <div
                              className="flex shrink-0 items-center gap-1.5"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {isExportMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedGastoIds.includes(
                                    getGastoSelectionId(gasto),
                                  )}
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

                          {/* Metadatos */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              {gasto.fecha?.split("T")[0] || "-"}
                            </span>
                            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                              {getDiasTranscurridos(gasto)} días
                            </span>
                            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                              {gasto.total ?? "-"} {gasto.moneda || "-"}
                            </span>
                            <span
                              className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getEstadoStyle(gasto.estado)}`}
                            >
                              {normalizeEstadoLabel(
                                gasto.estado || "Sin estado",
                              )}
                            </span>
                          </div>
                        </div>
                      </article>
                    )}
                  />
                </div>
                <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
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
                </div>
              </div>
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

        {/* PREVIEW FLOTANTE AL PASAR CURSOR SOBRE EVIDENCIA */}
        {hoverEvidenceSrc && (
          <div
            className="fixed z-40 pointer-events-none"
            style={{
              // POSICIONAMIENTO:
              // left: Se ajusta para no salir de la pantalla (ancho máximo: 320px)
              // top: Se posiciona arriba de la imagen (resta 250px), ajustándose si es necesario
              left:
                Math.min(hoverEvidencePos.x, window.innerWidth - 320) + "px",
              top:
                Math.min(hoverEvidencePos.y - 250, window.innerHeight - 320) +
                "px",
            }}
          >
            {/* CONTENEDOR DEL PREVIEW */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in duration-150">
              {/* IMAGEN DEL PREVIEW */}
              <img
                src={hoverEvidenceSrc}
                alt="Preview de evidencia"
                className="h-64 w-64 object-contain"
                // 👆 AQUÍ: Modificar tamaño
                // h-64 = altura 256px (16rem)
                // w-64 = ancho 256px (16rem)
                // object-contain = mantiene proporción
              />
            </div>
          </div>
        )}

        {previewGasto &&
          modalRoot &&
          createPortal(
            <>
              <button
                type="button"
                aria-label="Cerrar modal"
                className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px]"
                onClick={closePreview}
              />

              <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-auto p-4">
                <div className="flex w-full max-w-2xl flex-col overflow-hidden bg-transparent shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] backdrop-blur-sm max-h-[88vh] rounded-2xl p-0 sm:rounded-[1.35rem]">
                  <div className="min-h-0 flex-1 overflow-y-auto bg-linear-to-b from-white to-slate-50/70">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-2 border-b border-slate-200 bg-linear-to-r from-cyan-50 to-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                        <div className="min-w-0">
                          <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-800 sm:text-[15px]">
                            Vista previa:
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:text-xs">
                              # Id : {getGastoIdRend(previewGasto) || "-"}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getEstadoStyle(previewGasto.estado)}`}
                            >
                              {normalizeEstadoLabel(
                                previewGasto.estado || "Sin estado",
                              )}
                            </span>
                          </h3>
                          <IconClose
                            className="absolute right-3 top-3 h-6 w-6 cursor-pointer rounded-full p-1 text-slate-400 transition-all duration-200 hover:scale-110 hover:bg-red-100 hover:text-red-600 sm:right-4 sm:top-4"
                            onClick={closePreview}
                          />
                        </div>
                        {/*   <div className="shrink-0 text-left sm:text-right">
                                            <p className="text-sm font-semibold text-cyan-700 sm:text-[15px]">
                                                <span className="mr-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Total</span>
                                                {previewGasto.total ?? "-"} {previewGasto.moneda || ""}
                                            </p>
                                        </div> */}
                      </div>

                      <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Evidencia
                          </p>
                          <EvidenciaImagen
                            key={`${previewGasto?.id || previewGasto?.idrend || previewGasto?.evidenciaPath || previewGasto?.evidenciaFileName || "preview"}`}
                            gasto={previewGasto}
                            alt="Evidencia del gasto"
                            className="w-full cursor-zoom-in rounded-xl border border-slate-200 object-contain shadow-sm transition hover:opacity-90"
                            style={{ maxHeight: "220px" }}
                            onClick={(e) => setZoomSrc(e.currentTarget.src)}
                            fallback={
                              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                                <p className="text-xs text-slate-400">
                                  Sin evidencia adjunta
                                </p>
                              </div>
                            }
                          />
                        </div>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Datos Generales del Gasto:
                          </h2>
                          {[
                            [
                              "Política:",
                              firstDefined(
                                previewGasto?.politica,
                                previewGasto?.pol,
                                previewGasto?.nomPolitica,
                                "-",
                              ),
                            ],
                            [
                              "Centro de Costo:",
                              firstDefined(previewGasto?.consumidor, "-"),
                            ],
                            [
                              "Tipo de Gasto:",
                              firstDefined(previewGasto?.tipogasto, "-"),
                            ],
                            [
                              "Categoría:",
                              firstDefined(previewGasto?.categoria, "-"),
                            ],
                            [
                              "RUC Emisor:",
                              firstDefined(previewGasto?.ruc, "-"),
                            ],
                            [
                              "Razón Social:",
                              firstDefined(previewGasto?.proveedor, "-"),
                            ],
                            [
                              "RUC Cliente:",
                              firstDefined(previewGasto?.ruccliente, "-"),
                            ],
                            ["Placa:", firstDefined(previewGasto?.placa, "-")],
                          ].map(([label, value]) => (
                            <div key={label} className="col-span-1">
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 font-medium text-slate-700">
                                {value ?? "-"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Monto del Gasto:
                          </h2>
                          {[
                            ["Total:", firstDefined(previewGasto?.total, "-")],
                            ["IGV:", firstDefined(previewGasto?.igv, "-")],
                          ].map(([label, value]) => (
                            <div key={label} className="col-span-1">
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 font-medium text-slate-700">
                                {value ?? "-"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Datos de la Factura:
                          </h2>
                          {(isMovilidadGasto(previewGasto)
                            ? [
                                [
                                  "Tipo Comprobante:",
                                  getTipoComprobante(previewGasto) || "-",
                                ],
                                [
                                  "Fecha Emisión:",
                                  previewGasto.fecha?.split("T")[0] || "-",
                                ],
                                [
                                  "Serie - Número:",
                                  `${firstDefined(previewGasto?.serie, "-")} - ${firstDefined(previewGasto?.numero, "-")}`,
                                ],
                                [
                                  "LUGAR ORIGEN:",
                                  firstDefined(previewGasto?.lugarorigen, "-"),
                                ],
                                [
                                  "LUGAR DESTINO:",
                                  firstDefined(previewGasto?.lugardestino, "-"),
                                ],
                                [
                                  "TIPO MOVILIDAD:",
                                  firstDefined(
                                    previewGasto?.tipomovilidad,
                                    "-",
                                  ),
                                ],
                                [
                                  "Motivo Viaje:",
                                  firstDefined(previewGasto?.motivoviaje, "-"),
                                ],
                              ]
                            : [
                                [
                                  "Tipo Comprobante:",
                                  getTipoComprobante(previewGasto) || "-",
                                ],
                                [
                                  "Fecha Emisión:",
                                  previewGasto.fecha?.split("T")[0] || "-",
                                ],
                                [
                                  "Serie - Número:",
                                  `${firstDefined(previewGasto?.serie, "-")} - ${firstDefined(previewGasto?.numero, "-")}`,
                                ],
                                [
                                  "Total:",
                                  firstDefined(previewGasto?.total, "-"),
                                ],
                              ]
                          ).map(([label, value]) => (
                            <div key={label} className="col-span-1">
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 font-medium text-slate-700">
                                {value ?? "-"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Observación:
                          </h2>
                          <div className="col-span-2">
                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Glosa:
                            </dt>
                            <dd className="mt-0.5 font-medium text-slate-700">
                              {getGlosaOrNota(previewGasto) || "-"}
                            </dd>
                          </div>
                        </dl>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Motivo Rechazo:
                          </h2>
                          <div className="col-span-2">
                            <dd className="mt-0.5 font-medium text-slate-700">
                              {getMotivoRechazo(previewGasto) || "-"}
                            </dd>
                          </div>
                        </dl>

                        <div className="flex justify-end border-t border-slate-100 pt-3">
                          {/* <button
                            type="button"
                            onClick={closePreview}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                          >
                            Cerrar
                          </button> */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            modalRoot,
          )}
        <ImageZoomLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />

        <EditarGastoModal
          gasto={editGasto}
          isOpen={Boolean(editGasto)}
          onClose={closeEditModal}
          onSaved={handleEditSaved}
        />

        {showModal && (
          <>
            <button
              type="button"
              aria-label="Cerrar modal"
              className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px]"
              onClick={closeModal}
            />
            <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden p-0 sm:items-start sm:overflow-auto sm:p-8">
              <div
                className="
    flex w-full max-w-6xl flex-col
    max-h-[92dvh]
    overflow-hidden
    rounded-2xl
    border border-slate-200/90
    bg-white
    shadow-[0_24px_80px_-24px_rgba(15,23,42,0.5)]
    ring-1 ring-black/5
    sm:max-h-[92vh]
    sm:rounded-[1.35rem]
  "
              >
                <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-indigo-50 px-2.5 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <span className="h-9 w-1 rounded-full bg-linear-to-b from-blue-600 via-blue-700 to-indigo-500" />
                    <div className="min-w-0">
                      <h2 className="text-base font-extrabold leading-tight text-slate-800 sm:truncate sm:text-xl">
                        Crear Nuevo Gasto
                      </h2>
                      {selectedPolitica && (
                        <span className="mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          <IconEtiqueta className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {selectedPolitica.name}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedPolitica && (
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .querySelector("[data-gasto-form]")
                          ?.requestSubmit()
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-blue-200 bg-white text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900"
                  >
                    <IconClose className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 pb-3 sm:p-6 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {error && (
                    <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <label
                      className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400"
                      htmlFor="politica-select"
                    >
                      Política
                    </label>
                    <select
                      id="politica-select"
                      value={selectedPolitica?.id || ""}
                      onChange={handlePoliticaChange}
                      className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-slate-700 outline-none"
                    >
                      <option value="">Selecciona una política</option>
                      {politicas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    key={selectedPolitica?.id ?? "empty"}
                    style={{ animation: "gastoFormIn 0.22s ease-out" }}
                  >
                    <style>{`@keyframes gastoFormIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
                    {selectedPolitica ? (
                      esPoliticaMovilidad(selectedPolitica) ? (
                        <GastoMovilidad selectedPolitica={selectedPolitica} />
                      ) : (
                        <GastoGeneral selectedPolitica={selectedPolitica} />
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-400">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600">
                            Selecciona una política
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            El formulario aparecerá aquí según la política
                            elegida
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Toast
        message={toastConfig.message}
        type={toastConfig.type}
        isVisible={toastConfig.isVisible}
        onClose={closeToast}
        duration={2800}
      />
    </>
  );
}
