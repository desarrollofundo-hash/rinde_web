import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf.mjs";
import { updateDetalleGasto } from "../../services/update/updateGasto";
import { saveEvidenciaGasto } from "../../services/evidencia";
import { getDropdownOptionsCategoria } from "../../services/categoria";
import { getDropdownOptionsCentroCosto } from "../../services/centrocosto";
import { getDropdownOptionsTipoComprobante } from "../../services/tipocomprobante";
import { getDropdownOptionsTipoMovilidad } from "../../services/tipo_movilidad";
import { getApiRuc } from "../../services/ruc/api_ruc";
import { EvidenciaUploader } from "./FormGasto/ScannerCardsGrid";
import EvidenciaCropModal from "./FormGasto/EvidenciaCropModal";
import EvidenciaImagen, { clearEvidenciaImageCache } from "./EvidenciaImagen";
import { notifyEvidenciaSaved } from "../../services/getImage/getImage";
import { IconEdit } from "@/Icons/edit";
import { Save, X } from "lucide-react";
import { IconClose } from "@/Icons/close";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).href;

const getCroppedFile = async (imageElement, pixelCrop, originalFile) => {
  const canvas = document.createElement("canvas");
  const scaleX = imageElement.naturalWidth / imageElement.width;
  const scaleY = imageElement.naturalHeight / imageElement.height;
  const cropWidth = Math.max(1, Math.floor(pixelCrop.width * scaleX));
  const cropHeight = Math.max(1, Math.floor(pixelCrop.height * scaleY));

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    imageElement,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  const mimeType = originalFile?.type || "image/jpeg";
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, 0.95),
  );

  if (!blob) {
    throw new Error("No se pudo crear la imagen recortada");
  }

  return new File([blob], originalFile.name || "evidencia.jpg", {
    type: mimeType,
    lastModified: Date.now(),
  });
};

const isPdfFile = (file) => {
  if (!file) return false;

  const mimeType = String(file.type || "").toLowerCase();
  if (
    [
      "application/pdf",
      "application/x-pdf",
      "application/octet-stream",
    ].includes(mimeType)
  ) {
    return true;
  }

  return /\.pdf$/i.test(String(file.name || ""));
};

const convertPdfToImageFile = async (pdfFile) => {
  const pdfData = await pdfFile.arrayBuffer();
  const pdfDocument = await getDocument({ data: pdfData }).promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo preparar el lienzo para convertir el PDF");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvasContext: context, viewport }).promise;

  const renderedBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.95),
  );

  if (!renderedBlob) {
    throw new Error("No se pudo convertir el PDF a imagen");
  }

  const baseName = String(pdfFile.name || "evidencia.pdf").replace(
    /\.pdf$/i,
    "",
  );

  return new File([renderedBlob], `${baseName || "evidencia"}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

const cropPresets = [
  { key: "doc", label: "Documento", aspect: 4 / 3 },
  { key: "square", label: "Cuadrado", aspect: 1 / 1 },
  { key: "ticket", label: "Ticket", aspect: 16 / 9 },
  { key: "vertical", label: "Vertical", aspect: 3 / 4 },
  { key: "free", label: "Libre", aspect: null },
];

const FALLBACK_TIPOS_COMPROBANTE = [
  { id: "01", name: "FACTURA ELECTRONICA" },
  { id: "03", name: "BOLETA DE VENTA" },
  { id: "07", name: "NOTA DE CREDITO" },
  { id: "08", name: "NOTA DE DEBITO" },
  { id: "10", name: "RECIBO POR HONORARIO" },
  { id: "11", name: "OTROS" },
];

const createInitialCrop = (mediaWidth, mediaHeight, aspect) => {
  if (!aspect) {
    return centerCrop(
      {
        unit: "%",
        width: 80,
        height: 80,
      },
      mediaWidth,
      mediaHeight,
    );
  }

  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
};

const getLocalIsoDateTime = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });

  const parts = formatter
    .formatToParts(new Date())
    .reduce((accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    }, {});

  const fractionalSeconds = String(parts.fractionalSecond || "000")
    .padEnd(3, "0")
    .slice(0, 3);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${fractionalSeconds}-05:00`;
};

const toInputDate = (value) => {
  if (!value) return "";
  const text = String(value);
  if (text.includes("T")) return text.split("T")[0];
  return text;
};

const firstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const getFieldValue = (source, keys) => {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const directValue = source[key];
    if (
      directValue !== undefined &&
      directValue !== null &&
      String(directValue).trim() !== ""
    ) {
      return directValue;
    }

    const matchedKey = Object.keys(source).find(
      (currentKey) => currentKey.toLowerCase() === String(key).toLowerCase(),
    );
    if (matchedKey) {
      const matchedValue = source[matchedKey];
      if (
        matchedValue !== undefined &&
        matchedValue !== null &&
        String(matchedValue).trim() !== ""
      ) {
        return matchedValue;
      }
    }
  }

  return "";
};

const resolveTipoComprobante = (gasto) => {
  const value = getFieldValue(gasto, [
    "tipocomprobante",
    "tipoComprobante",
    "tipoCombrobante",
    "tipo_comprobante",
    "codTipoComprobante",
    "codigoTipoComprobante",
    "idTipoComprobante",
  ]);

  if (value && typeof value === "object") {
    return String(
      firstDefined(
        value.name,
        value.nombre,
        value.descripcion,
        value.description,
        value.label,
        value.value,
        value.codigo,
        value.code,
        value.id,
        "",
      ),
    );
  }

  return String(value || "");
};

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

export default function EditarGastoModal({ gasto, isOpen, onClose, onSaved }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const prevGastoIdRef = useRef(null);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [activeTab, setActiveTab] = useState("general");
  const [categoriaBusqueda, setCategoriaBusqueda] = useState("");
  const [categoriaAbierta, setCategoriaAbierta] = useState(false);
  const categoriaRef = useRef(null);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [tiposComprobante, setTiposComprobante] = useState(
    FALLBACK_TIPOS_COMPROBANTE,
  );
  const [tiposMovilidad, setTiposMovilidad] = useState([]);
  // Estados para cambio de evidencia
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [newEvidencia, setNewEvidencia] = useState(null);
  const [newEvidenciaPreviewUrl, setNewEvidenciaPreviewUrl] = useState("");
  const [zoomPreview, setZoomPreview] = useState(1);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [isEvidenciaCropMode, setIsEvidenciaCropMode] = useState(false);
  const [evidenciaCrop, setEvidenciaCrop] = useState();
  const [completedEvidenciaCrop, setCompletedEvidenciaCrop] = useState(null);
  const [selectedEvidenciaPreset, setSelectedEvidenciaPreset] = useState("doc");
  const [evidenciaCropShape, setEvidenciaCropShape] = useState("rect");
  const [isEvidenciaSaving, setIsEvidenciaSaving] = useState(false);
  const imageCropRef = useRef(null);
  const modalRoot = typeof document !== "undefined" ? document.body : null;
  const [formData, setFormData] = useState({
    proveedor: "",
    glosa: "",
    // comentario: nota/observación del front que va SIEMPRE en la columna "obs" (obsCabecera) del primer API.
    comentario: "",
    // evidencia: obs contiene la ruta de evidencia si se cambió, sino el valor original (solo para preview local).
    obs: "",
    centroCostoId: "",
    centroCosto: "",
    categoriaId: "",
    rucEmisor: "",
    razonSocial: "",
    rucCliente: "",
    tipoComprobante: "",
    tipoComprobanteId: "",
    serie: "",
    numero: "",
    fecha: "",
    total: "",
    igv: "",
    moneda: "",
    categoria: "",
    tipogasto: "",
    politica: "",
    origen: "",
    destino: "",
    motivoViaje: "",
    tipoMovilidad: "",
    placa: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      return undefined;
    }
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Cierra el combobox de categoría al hacer clic fuera
  useEffect(() => {
    if (!categoriaAbierta) return;
    const handler = (e) => {
      if (categoriaRef.current && !categoriaRef.current.contains(e.target)) {
        setCategoriaAbierta(false);
        setCategoriaBusqueda("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [categoriaAbierta]);

  useEffect(() => {
    if (!gasto) return;

    // comentario: obsCabecera real que persiste el backend en la columna "obs" de la cabecera.
    const comentario = String(
      gasto.obs || gasto.nota || gasto.obs1 || "",
    ).trim();
    const glosaRaw = String(gasto.glosa || "").trim();
    const glosaIsPlaceholder = [
      "CREAR GASTO",
      "CREAR GASTO MOVILIDAD",
    ].includes(glosaRaw.toUpperCase());
    const glosaValue = glosaRaw && !glosaIsPlaceholder ? glosaRaw : comentario;

    /*    const glosaValue =
          glosaRaw && !glosaIsPlaceholder
            ? glosaRaw
            : String(gasto.obs || gasto.nota || "").trim(); */

    const initialData = {
      proveedor: String(gasto.proveedor || ""),
      glosa: glosaValue,
      comentario: comentario,
      obs: String(gasto.obs || ""),
      centroCostoId: String(gasto.idcuenta || ""),
      centroCosto: String(
        gasto.centroCosto ||
          gasto.consumidor ||
          gasto.idCuenta ||
          gasto.idcuenta ||
          "",
      ),
      categoriaId: String(
        gasto.idCategoria ||
          gasto.idcategoria ||
          gasto.categoriaId ||
          gasto.categoria_id ||
          "",
      ),
      rucEmisor: String(gasto.ruc || ""),
      razonSocial: String(gasto.razonSocial || gasto.proveedor || ""),
      rucCliente: String(gasto.ruccliente || ""),
      tipoComprobante: resolveTipoComprobante(gasto),
      serie: String(gasto.serie || ""),
      numero: String(gasto.numero || ""),
      fecha: toInputDate(gasto.fecha),
      total: String(gasto.total ?? ""),
      igv: String(gasto.igv ?? ""),
      moneda: String(gasto.moneda || ""),
      categoria: String(gasto.categoria || ""),
      tipogasto: String(gasto.tipogasto || ""),
      politica: String(gasto.politica || ""),
      origen: String(
        gasto.lugarOrigen || gasto.lugarorigen || gasto.origen || "",
      ),
      destino: String(
        gasto.lugarDestino || gasto.lugardestino || gasto.destino || "",
      ),
      motivoViaje: String(gasto.motivoViaje || gasto.motivoviaje || ""),
      tipoMovilidad: String(gasto.tipoMovilidad || gasto.tipomovilidad || ""),
      placa: String(gasto.placa || ""),
    };
    const gastoId = String(gasto.idrend || gasto.id || "");
    const gastoChanged = gastoId !== prevGastoIdRef.current;
    prevGastoIdRef.current = gastoId;

    setFormData(initialData);
    setError("");

    // Solo resetear el modo edición y limpiar evidencia cuando se abre un gasto diferente.
    // Si es el mismo gasto (re-render por refetch del padre), conservar el estado de edición.
    if (gastoChanged) {
      setIsEditing(false);
      if (newEvidenciaPreviewUrl) {
        URL.revokeObjectURL(newEvidenciaPreviewUrl);
      }
      setShowEvidenciaModal(false);
      setNewEvidencia(null);
      setNewEvidenciaPreviewUrl("");
      setIsEvidenciaCropMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gasto]);

  useEffect(() => {
    const loadEditOptions = async () => {
      if (!isOpen) return;

      try {
        const categoriasData = await getDropdownOptionsCategoria({
          politica: String(formData.politica || "todos"),
        });
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      } catch (loadError) {
        /*                 console.warn("No se pudieron cargar categorias para editar:", loadError?.message);
         */ setCategorias([]);
      }

      try {
        const tiposComprobanteData = await getDropdownOptionsTipoComprobante();
        setTiposComprobante(
          Array.isArray(tiposComprobanteData) && tiposComprobanteData.length
            ? tiposComprobanteData
            : FALLBACK_TIPOS_COMPROBANTE,
        );
      } catch (loadError) {
        setTiposComprobante(FALLBACK_TIPOS_COMPROBANTE);
      }

      try {
        const tiposMovilidadData = await getDropdownOptionsTipoMovilidad();
        setTiposMovilidad(
          Array.isArray(tiposMovilidadData) ? tiposMovilidadData : [],
        );
      } catch (loadError) {
        setTiposMovilidad([]);
      }

      try {
        const userRaw = localStorage.getItem("user");
        const companyRaw =
          localStorage.getItem("company") || localStorage.getItem("empresa");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const company = companyRaw ? JSON.parse(companyRaw) : null;

        const iduser = String(user?.usecod ?? user?.iduser ?? user?.id ?? "");
        const empresa = String(
          company?.empresa ?? company?.nombre ?? company?.name ?? "",
        );

        if (!iduser || !empresa) {
          setCentrosCosto([]);
          return;
        }

        const centrosData = await getDropdownOptionsCentroCosto({
          iduser,
          empresa,
        });
        setCentrosCosto(Array.isArray(centrosData) ? centrosData : []);
      } catch (loadError) {
        /*  console.warn("No se pudieron cargar centros de costo para editar:", loadError?.message); */
        setCentrosCosto([]);
      }
    };

    loadEditOptions();
  }, [isOpen, formData.politica]);

  useEffect(() => {
    if (!categorias.length || formData.categoriaId) return;

    const matchByText = categorias.find(
      (item) =>
        String(item.name || "")
          .trim()
          .toLowerCase() ===
        String(formData.categoria || "")
          .trim()
          .toLowerCase(),
    );

    if (!matchByText) return;

    setFormData((prev) => ({
      ...prev,
      categoriaId: String(matchByText.id || ""),
    }));
  }, [categorias, formData.categoria, formData.categoriaId]);

  useEffect(() => {
    if (!tiposComprobante.length || formData.tipoComprobanteId) return;

    const tipoComprobanteValue = String(formData.tipoComprobante || "")
      .trim()
      .toLowerCase();
    const matchByText = tiposComprobante.find((item) => {
      const itemId = String(item.id || "")
        .trim()
        .toLowerCase();
      const itemName = String(item.name || "")
        .trim()
        .toLowerCase();
      return (
        itemName === tipoComprobanteValue || itemId === tipoComprobanteValue
      );
    });

    if (!matchByText) return;

    setFormData((prev) => ({
      ...prev,
      tipoComprobanteId: String(matchByText.id || ""),
    }));
  }, [tiposComprobante, formData.tipoComprobante, formData.tipoComprobanteId]);

  useEffect(() => {
    if (!centrosCosto.length) return;
    if (formData.centroCostoId) return;

    const matchByText = centrosCosto.find((item) => {
      const label = String(item.consumidor || item.name || "")
        .trim()
        .toLowerCase();
      return (
        label &&
        label ===
          String(formData.centroCosto || "")
            .trim()
            .toLowerCase()
      );
    });

    if (!matchByText) return;

    setFormData((prev) => ({
      ...prev,
      centroCostoId: String(matchByText.id || ""),
    }));
  }, [centrosCosto, formData.centroCosto, formData.centroCostoId]);

  const title = useMemo(() => {
    const proveedor = String(gasto?.proveedor || "").trim();
    const idRend = String(
      firstDefined(gasto?.idrend, gasto?.idRend, gasto?.id, "-"),
    ).trim();

    return (
      <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
        {/* Mobile: label pequeño + nombre prominente */}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:hidden">
          Editar gasto
        </span>
        <span className="truncate font-bold text-slate-800 sm:text-inherit sm:font-extrabold">
          {proveedor || "Sin proveedor"}
        </span>
        {/* Desktop prefix */}
        <span className="hidden sm:contents">
          <span className="text-slate-300">·</span>
          <span className="text-blue-700">{proveedor}</span>
        </span>
        {idRend && (
          <span className="inline-flex w-fit rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:text-xs">
            #ID Rend:{idRend}
          </span>
        )}
      </span>
    );
  }, [gasto]);

  const evidenciaVisibleSrc = newEvidenciaPreviewUrl;

  const handleCategoriaChange = (e) => {
    const selectedId = String(e.target.value || "");
    const categoria = categorias.find((item) => String(item.id) === selectedId);
    setFormData((prev) => ({
      ...prev,
      categoriaId: selectedId,
      categoria: String(categoria?.name || prev.categoria || ""),
    }));
  };

  const handleTipoComprobanteChange = (e) => {
    const selectedId = String(e.target.value || "");
    const tipo = tiposComprobante.find(
      (item) => String(item.id) === selectedId,
    );
    setFormData((prev) => ({
      ...prev,
      tipoComprobanteId: selectedId,
      tipoComprobante: String(tipo?.name || prev.tipoComprobante || ""),
    }));
  };

  const handleMonedaChange = (e) => {
    const code = String(e.target.value || "");
    const monedaDescripcion =
      code === "01" ? "PEN" : code === "03" ? "USD" : "";
    setFormData((prev) => ({ ...prev, moneda: monedaDescripcion }));
  };

  const handleRucEmisorKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const ruc = String(formData.rucEmisor || "").trim();
    if (!/^\d{11}$/.test(ruc)) return;

    try {
      const data = await getApiRuc({ ruc });
      const razonSocial =
        data?.razonSocial ||
        data?.nombre_o_razon_social ||
        data?.nombreORazonSocial ||
        data?.nombre ||
        data?.nombreComercial ||
        data?.nombreComercialSunat ||
        "";

      if (razonSocial) {
        setFormData((prev) => ({ ...prev, razonSocial }));
      }
    } catch (error) {
      /* console.error("❌ Error validando RUC emisor:", error.message); */
    }
  };

  const handleCentroCostoChange = (e) => {
    const selectedId = String(e.target.value || "");
    const centro = centrosCosto.find((item) => String(item.id) === selectedId);
    setFormData((prev) => ({
      ...prev,
      centroCostoId: selectedId,
      centroCosto: String(
        centro?.consumidor || centro?.name || prev.centroCosto || "",
      ),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "glosa") {
        return { ...prev, glosa: value, comentario: value };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleOpenEvidenciaChangeModal = () => {
    setError("");
    // Limpia la evidencia anterior para mostrar el uploader en blanco
    if (newEvidenciaPreviewUrl?.startsWith("blob:"))
      URL.revokeObjectURL(newEvidenciaPreviewUrl);
    setNewEvidencia(null);
    setNewEvidenciaPreviewUrl("");
    setZoomPreview(1);
    setPanOffset({ x: 0, y: 0 });
    setShowEvidenciaModal(true);
  };

  const handleEvidenciaFileChange = async (e) => {
    let selectedFile = e.target.files?.[0] || null;

    if (isPdfFile(selectedFile)) {
      setIsConvertingPdf(true);
      setError("");
      try {
        selectedFile = await convertPdfToImageFile(selectedFile);
      } catch (error) {
        console.error("No se pudo convertir el PDF a imagen", error);
        setError("No se pudo convertir el PDF a imagen. Intenta con otro archivo.");
        setIsConvertingPdf(false);
        return;
      }
      setIsConvertingPdf(false);
    }

    setNewEvidencia(selectedFile);

    if (selectedFile) {
      if (newEvidenciaPreviewUrl) {
        URL.revokeObjectURL(newEvidenciaPreviewUrl);
      }
      setNewEvidenciaPreviewUrl(URL.createObjectURL(selectedFile));
      setZoomPreview(1);
      setPanOffset({ x: 0, y: 0 });
      setIsEvidenciaCropMode(false);
      setEvidenciaCrop(undefined);
      setCompletedEvidenciaCrop(null);
      setSelectedEvidenciaPreset("doc");
      setEvidenciaCropShape("rect");
    } else {
      setNewEvidenciaPreviewUrl("");
    }
  };

  const handleImageLoaded = useCallback(
    (event) => {
      const image = event.currentTarget;
      imageCropRef.current = image;
      const selectedAspect =
        cropPresets.find((item) => item.key === selectedEvidenciaPreset)
          ?.aspect || null;
      setEvidenciaCrop(
        createInitialCrop(image.width, image.height, selectedAspect),
      );
      setCompletedEvidenciaCrop(null);
    },
    [selectedEvidenciaPreset],
  );

  const handleStartEvidenciaCrop = () => {
    setIsEvidenciaCropMode(true);
  };

  const handleCancelEvidenciaCrop = () => {
    setIsEvidenciaCropMode(false);
  };

  const handleCompleteEvidenciaCrop = (crop) => {
    setCompletedEvidenciaCrop(crop);
  };

  const handleApplyEvidenciaCrop = async () => {
    if (!newEvidencia || !completedEvidenciaCrop || !imageCropRef.current)
      return;

    try {
      const croppedFile = await getCroppedFile(
        imageCropRef.current,
        completedEvidenciaCrop,
        newEvidencia,
      );

      if (newEvidenciaPreviewUrl) {
        URL.revokeObjectURL(newEvidenciaPreviewUrl);
      }

      const newPreview = URL.createObjectURL(croppedFile);
      setNewEvidencia(croppedFile);
      setNewEvidenciaPreviewUrl(newPreview);
      setIsEvidenciaCropMode(false);
    } catch (cropError) {
      /*   console.error("❌ Error recortando imagen:", cropError); */
      alert("No se pudo recortar la imagen");
    }
  };

  const handleChangeEvidenciaPreset = (presetKey) => {
    const presetAspect =
      cropPresets.find((item) => item.key === presetKey)?.aspect || null;
    setSelectedEvidenciaPreset(presetKey);

    if (imageCropRef.current) {
      setEvidenciaCrop(
        createInitialCrop(
          imageCropRef.current.width,
          imageCropRef.current.height,
          presetAspect,
        ),
      );
      setCompletedEvidenciaCrop(null);
    }
  };

  const handleSetEvidenciaCropShape = (shape) => {
    setEvidenciaCropShape(shape);
  };

  const handleResetEvidenciaCrop = () => {
    if (imageCropRef.current) {
      const selectedAspect =
        cropPresets.find((item) => item.key === selectedEvidenciaPreset)
          ?.aspect || null;
      setEvidenciaCrop(
        createInitialCrop(
          imageCropRef.current.width,
          imageCropRef.current.height,
          selectedAspect,
        ),
      );
      setCompletedEvidenciaCrop(null);
    } else {
      setEvidenciaCrop(undefined);
      setCompletedEvidenciaCrop(null);
    }
    setSelectedEvidenciaPreset("doc");
    setEvidenciaCropShape("rect");
  };

  const handleSaveNewEvidencia = async () => {
    setError("");
    setShowEvidenciaModal(false);
  };

  const buildEvidenceUpdate = async () => {
    if (!newEvidencia) return null;

    const idRend = String(gasto?.idrend || "").trim();

    if (!idRend) {
      throw new Error(
        "No se pudo obtener el ID de la rendición. Por favor recarga el modal.",
      );
    }

    const result = await saveEvidenciaGasto({
      idRend,
      file: newEvidencia,
      gastoData: {
        ruc: String(formData.rucEmisor || gasto.ruc || ""),
        serie: String(formData.serie || gasto.serie || ""),
        numero: String(formData.numero || gasto.numero || ""),
      },
    });

    if (!result?.path) {
      throw new Error(
        "La respuesta del servidor no contiene la ruta de la evidencia",
      );
    }

    const evidenciaPath = String(result.path).trim();
    const evidenciaFileName = String(
      result?.fileName || newEvidencia?.name || "",
    ).trim();
    // No incluir "obs" aquí: esa columna es el comentario de cabecera (obsCabecera) y no debe
    // sobreescribirse con la ruta de evidencia (obsDetalle ya se guardó en saveEvidenciaGasto).
    const evidenciaPatch = {
      evidenciaPath,
      evidenciaFileName,
      evidenciaUpdatedAt: getLocalIsoDateTime(),
      path: evidenciaPath,
      ruta: evidenciaPath,
      rutaArchivo: evidenciaPath,
      pathArchivo: evidenciaPath,
      archivo: evidenciaFileName,
      fileName: evidenciaFileName,
      filename: evidenciaFileName,
      nombreArchivo: evidenciaFileName,
      nombrearchivo: evidenciaFileName,
      nomArchivo: evidenciaFileName,
      nomarchivo: evidenciaFileName,
    };

    return {
      idRend,
      evidenciaPath,
      evidenciaFileName,
      evidenciaPatch,
    };
  };

  const handleCloseEvidenciaModal = () => {
    setError("");
    setShowEvidenciaModal(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const nowIso = getLocalIsoDateTime();
      const idRendValue = String(gasto.idrend || "");
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const userId =
        Number.parseInt(
          String(user?.id ?? user?.usecod ?? user?.iduser ?? 0),
          10,
        ) || 0;
      const userDni = String(user?.dni || "").trim();
      const categoriaSeleccionada =
        categorias.find(
          (item) =>
            String(item.id) ===
            String(formData.categoriaId || categoriaSelectedId),
        ) || null;
      const centroCostoSeleccionado =
        centrosCosto.find(
          (item) =>
            String(item.id) ===
            String(formData.centroCostoId || centroSelectedId),
        ) || null;

      const resolvedCategoria = String(
        categoriaSeleccionada?.name ||
          formData.categoria ||
          gasto.categoria ||
          "",
      );
      const resolvedIdCuenta = String(
        formData.centroCostoId ||
          centroCostoSeleccionado?.id ||
          centroCostoSeleccionado?.raw?.idCuenta ||
          centroCostoSeleccionado?.raw?.idcuenta ||
          gasto.idCuenta ||
          gasto.idcuenta ||
          "",
      );
      const resolvedConsumidor = String(
        formData.centroCosto ||
          centroCostoSeleccionado?.consumidor ||
          centroCostoSeleccionado?.name ||
          centroCostoSeleccionado?.raw?.consumidor ||
          gasto.centroCosto ||
          gasto.consumidor ||
          "",
      );
      const notaObsValue = String(
        formData.glosa || formData.comentario || "",
      ).trim();
      const categoriaForEvidence = String(
        formData.categoria || gasto.categoria || "",
      );
      const isViajesConComprobante = normalizeText(
        categoriaForEvidence,
      ).includes("VIAJES CON COMPROBANTE");
      const tipoComprobanteValue = String(
        formData.tipoComprobante || resolveTipoComprobante(gasto) || "",
      ).trim();
      const tipoComprobanteSeleccionado =
        tiposComprobante.find((item) => {
          const itemId = String(item.id || "")
            .trim()
            .toLowerCase();
          const itemName = String(item.name || "")
            .trim()
            .toLowerCase();
          const formTipoLower = tipoComprobanteValue.toLowerCase();
          return (
            itemId ===
              String(formData.tipoComprobanteId || "")
                .trim()
                .toLowerCase() ||
            itemName === formTipoLower ||
            itemId === formTipoLower
          );
        }) || null;
      const tipoComprobanteDescripcion = String(
        tipoComprobanteSeleccionado?.name || tipoComprobanteValue || "",
      ).trim();
      const tipoComprobanteCodigo = String(
        formData.tipoComprobanteId || tipoComprobanteSeleccionado?.id || "",
      ).trim();

      // Construir payload con TODOS los campos necesarios (backend puede esperar el objeto completo)
      let evidenciaUpdate = null;
      if (newEvidencia) {
        setIsEvidenciaSaving(true);
        try {
          evidenciaUpdate = await buildEvidenceUpdate();
          if (evidenciaUpdate?.evidenciaPatch) {
            setFormData((prev) => ({
              ...prev,
              obs: evidenciaUpdate.evidenciaPath,
              ...evidenciaUpdate.evidenciaPatch,
            }));
          }
        } finally {
          setIsEvidenciaSaving(false);
        }
      }

      const obsForPayload =
        isViajesConComprobante && evidenciaUpdate?.evidenciaPath
          ? String(evidenciaUpdate.evidenciaPath)
          : notaObsValue;

      const payload = {
        rendicion: idRendValue, // CAMPO REQUERIDO: alias de idRend para el backend
        idRend: idRendValue,
        idrend: idRendValue,
        idUser: userId,
        dni: userDni,
        politica: String(formData.politica || gasto.politica || ""),
        categoria: resolvedCategoria,
        categoriaId: String(
          formData.categoriaId ||
            categoriaSeleccionada?.id ||
            gasto.idCategoria ||
            gasto.idcategoria ||
            gasto.categoriaId ||
            gasto.categoria_id ||
            "",
        ),
        idCategoria: String(
          formData.categoriaId ||
            categoriaSeleccionada?.id ||
            gasto.idCategoria ||
            gasto.idcategoria ||
            gasto.categoriaId ||
            gasto.categoria_id ||
            "",
        ),
        tipogasto: String(formData.tipogasto || gasto.tipogasto || ""),
        ruc: String(formData.rucEmisor || gasto.rucEmisor || gasto.ruc || ""),
        proveedor: String(
          formData.razonSocial || formData.proveedor || gasto.proveedor || "",
        ),
        tipoComprobante: tipoComprobanteDescripcion,
        tipocomprobante: tipoComprobanteDescripcion,
        tipoCombrobante: tipoComprobanteDescripcion,
        idTipoComprobante: tipoComprobanteCodigo,
        codTipoComprobante: tipoComprobanteCodigo,
        codigoTipoComprobante: tipoComprobanteCodigo,
        serie: String(formData.serie || gasto.serie || ""),
        numero: String(formData.numero || gasto.numero || ""),
        igv: Number(formData.igv || 0),
        fecha: String(formData.fecha || ""),
        total: Number(formData.total || 0),
        moneda: String(formData.moneda || ""),
        rucCliente: String(
          formData.rucCliente || gasto.rucCliente || gasto.ruccliente || "",
        ),
        desEmp: String(gasto.desEmp || ""),
        desSed: String(gasto.desSed || ""),
        gerencia: String(gasto.gerencia || ""),
        area: String(gasto.area || ""),
        idCuenta: resolvedIdCuenta,
        idcuenta: resolvedIdCuenta,
        centroCostoId: resolvedIdCuenta,
        consumidor: resolvedConsumidor,
        centroCosto: resolvedConsumidor,
        placa: String(formData.placa || gasto.placa || ""),
        estadoActual: String(gasto.estadoActual || gasto.estado || ""),
        glosa: notaObsValue,
        motivoViaje: String(formData.motivoViaje || gasto.motivoViaje || ""),
        lugarOrigen: String(
          formData.origen || gasto.lugarOrigen || gasto.lugarorigen || "",
        ),
        lugarDestino: String(
          formData.destino || gasto.lugarDestino || gasto.lugardestino || "",
        ),
        tipoMovilidad: String(
          formData.tipoMovilidad ||
            gasto.tipoMovilidad ||
            gasto.tipomovilidad ||
            "",
        ),
        // En viajes con comprobante algunos listados resuelven evidencia desde "obs".
        obs: obsForPayload,
        nota: notaObsValue,
        observacion: notaObsValue,
        observaciones: notaObsValue,
        evidenciaPath: String(evidenciaUpdate?.evidenciaPath || ""),
        evidenciaFileName: String(evidenciaUpdate?.evidenciaFileName || ""),
        evidenciaUpdatedAt: String(
          evidenciaUpdate?.evidenciaPatch?.evidenciaUpdatedAt ||
            getLocalIsoDateTime(),
        ),
        ...(evidenciaUpdate?.evidenciaPatch || {}),
        estado: String(gasto.estado || "S"),
        fecCre: String(gasto.fecCre || nowIso),
        useReg: userId,
        hostname: String(gasto.hostname || "WEB"),
        fecEdit: nowIso,
        useEdit: userId,
        useElim: 0,
      };
      await updateDetalleGasto(payload);
      if (evidenciaUpdate?.evidenciaPath) {
        notifyEvidenciaSaved(
          idRendValue,
          evidenciaUpdate.evidenciaPath,
          evidenciaUpdate.evidenciaFileName,
        );
      }
      clearEvidenciaImageCache();
      window.dispatchEvent(new CustomEvent("gasto:updated"));

      if (typeof onSaved === "function") {
        await onSaved(payload);
      }

      setIsEditing(false);
      onClose();
    } catch (submitError) {
      setError(submitError?.message || "No se pudo actualizar el gasto");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400";
  const inputReadOnlyClass =
    "w-full rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-600";
  const selectReadOnlyClass =
    "w-full rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-500";
  const labelClass =
    "min-w-0 flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400";
  const sectionClass =
    "rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_1px_4px_rgba(15,23,42,0.06)]";
  const sectionTitleClass =
    "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100 px-4 py-2.5 mb-0";
  const sectionBodyClass = "p-4";

  const categoriaSelectedId = useMemo(() => {
    if (formData.categoriaId) return String(formData.categoriaId);
    const match = categorias.find(
      (item) =>
        String(item.name || "")
          .trim()
          .toLowerCase() ===
        String(formData.categoria || "")
          .trim()
          .toLowerCase(),
    );
    return String(match?.id || "");
  }, [categorias, formData.categoria, formData.categoriaId]);

  const centroSelectedId = useMemo(() => {
    if (formData.centroCostoId) return String(formData.centroCostoId);
    const match = centrosCosto.find(
      (item) =>
        String(item.consumidor || item.name || "")
          .trim()
          .toLowerCase() ===
        String(formData.centroCosto || "")
          .trim()
          .toLowerCase(),
    );
    return String(match?.id || "");
  }, [centrosCosto, formData.centroCosto, formData.centroCostoId]);

  const tipoComprobanteSelectedId = useMemo(() => {
    if (formData.tipoComprobanteId) return String(formData.tipoComprobanteId);
    const tipoComprobanteValue = String(formData.tipoComprobante || "")
      .trim()
      .toLowerCase();
    const match = tiposComprobante.find((item) => {
      const itemId = String(item.id || "")
        .trim()
        .toLowerCase();
      const itemName = String(item.name || "")
        .trim()
        .toLowerCase();
      return (
        itemName === tipoComprobanteValue || itemId === tipoComprobanteValue
      );
    });
    return String(match?.id || "");
  }, [tiposComprobante, formData.tipoComprobante, formData.tipoComprobanteId]);

  const monedaSelectedId = useMemo(() => {
    const moneda = String(formData.moneda || "")
      .trim()
      .toUpperCase();
    if (moneda === "01" || moneda === "03") return moneda;
    if (moneda === "PEN") return "01";
    if (moneda === "USD") return "03";
    return "";
  }, [formData.moneda]);

  const isPlanillaMovilidad = useMemo(
    () =>
      normalizeText(formData.categoria || "").includes("PLANILLA DE MOVILIDAD"),
    [formData.categoria],
  );

  if (!isOpen || !gasto) return null;

  return modalRoot
    ? createPortal(
        <>
          <button
            type="button"
            aria-label="Cerrar modal"
            className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden p-0 sm:items-start sm:p-8">
            <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-slate-50 shadow-[0_-8px_40px_rgba(15,23,42,0.18)] sm:h-auto sm:max-h-[90vh] sm:rounded-[1.35rem] sm:border sm:border-slate-200/80 sm:shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)]">
              {/* ── MOBILE HERO — solo visible en móvil ── */}
              <div className="shrink-0 sm:hidden">
                <div className="flex justify-center bg-blue-700 pt-3 pb-1">
                  <div className="h-1 w-10 rounded-full bg-white/30" />
                </div>
                <div className="relative bg-linear-to-br from-blue-700 via-blue-600 to-indigo-600 px-4 pt-2 pb-8">
                  <div className="absolute bottom-0 left-0 right-0 h-5 rounded-t-3xl bg-slate-50" />
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Editar gasto</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {String(gasto?.estado || "Borrador")}
                      </span>
                      <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white cursor-pointer">
                        <IconClose className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-[15px] font-bold text-white leading-tight">
                    {String(gasto?.proveedor || "Sin proveedor")}
                  </p>
                  <p className="mb-3 text-[11px] text-blue-200">
                    {String(gasto?.categoria || gasto?.categorianom || formData.politica || "")} · #ID {String(gasto?.idrend || gasto?.id || "-")}
                  </p>
                  <div className="relative z-10 flex gap-2 mb-3">
                    {[
                      { label: "Total", value: `S/ ${formData.total ?? 0}` },
                      { label: "IGV", value: formData.igv ?? 0 },
                      { label: "Fecha", value: formData.fecha ? String(formData.fecha).slice(5).replace("-", "/") : "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex-1 rounded-xl bg-white/15 px-2.5 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-blue-200">{label}</p>
                        <p className="text-[13px] font-black text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Botones de acción dentro del hero */}
                  <div className="relative z-10 flex gap-2">
                    <button
                      type="button"
                      disabled={!isEditing || isSaving}
                      onClick={handleSubmit}
                      className={`inline-flex h-9 flex-[2] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 cursor-pointer ${
                        isEditing
                          ? "bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-sm shadow-amber-900/20"
                          : "bg-white/10 text-white/35 cursor-not-allowed"
                      }`}
                    >
                      <Save className="h-3.5 w-3.5 shrink-0" />
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/40 bg-white/20 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-95 cursor-pointer"
                      >
                        <IconEdit className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white/80 transition hover:bg-white/20 active:scale-95 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── DESKTOP HEADER — oculto en móvil ── */}
              <div className="sticky top-0 z-20 hidden shrink-0 sm:flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                {/* Ícono */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm shadow-blue-700/30">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {String(gasto?.proveedor || "Sin proveedor")}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {String(gasto?.categoria || gasto?.categorianom || formData.politica || "")}
                    {formData.rucEmisor ? ` · RUC ${formData.rucEmisor}` : ""}
                  </p>
                </div>
                {/* Badges */}
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {String(gasto?.estado || gasto?.estadoActual || "Borrador")}
                  </span>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-200">
                    # {String(gasto?.idrend || gasto?.id || "—")}
                  </span>
                  <div className="mx-1 h-4 w-px bg-slate-200" />
                  <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
                    <IconClose className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* ── MOBILE TABS — oculto en sm+ ── */}
              <div className="shrink-0 bg-slate-50 px-3 pt-2.5 pb-2 sm:hidden">
                <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
                  {[
                    { key: "general", label: "General" },
                    { key: "comprobante", label: "Comprobante" },
                    { key: "evidencia", label: "Evidencia" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                        activeTab === key
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {error && (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 pb-2 sm:bg-linear-to-b sm:from-white sm:to-slate-50/70 sm:p-5 lg:flex lg:flex-col lg:overflow-hidden lg:p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {error && (
                  <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
                >
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:min-h-0 lg:flex-1">
                    {/* Solo esta columna hace scroll propio en pantallas lg+; la evidencia queda fija */}
                    <div className="space-y-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden">
                      <section className={`${sectionClass} ${activeTab !== "general" ? "hidden sm:block" : "block"}`}>
                        <h3 className={sectionTitleClass}><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />Datos Generales</h3>
                        <div className={sectionBodyClass}><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className={labelClass}>
                            Politica
                            <input
                              name="politica"
                              value={formData.politica}
                              readOnly
                              className={inputReadOnlyClass}
                            />
                          </label>
                          <label className={labelClass}>
                            Categoria
                            {isEditing ? (
                              <div ref={categoriaRef} className="relative">
                                {/* Botón que muestra la selección actual */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCategoriaAbierta((v) => !v);
                                    setCategoriaBusqueda("");
                                  }}
                                  className={`${inputClass} flex items-center justify-between text-left`}
                                >
                                  <span
                                    className={
                                      categoriaSelectedId
                                        ? "text-slate-700"
                                        : "text-slate-400"
                                    }
                                  >
                                    {categoriaSelectedId
                                      ? (categorias.find(
                                          (c) =>
                                            String(c.id) ===
                                            categoriaSelectedId,
                                        )?.name ?? formData.categoria)
                                      : formData.categoria ||
                                        "Selecciona una categoría"}
                                  </span>
                                  <svg
                                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${categoriaAbierta ? "rotate-180" : ""}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>

                                {/* Dropdown con buscador */}
                                {categoriaAbierta && (
                                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {/* Input de búsqueda */}
                                    <div className="p-2 border-b border-slate-100">
                                      <input
                                        autoFocus
                                        type="text"
                                        placeholder="Buscar categoría..."
                                        value={categoriaBusqueda}
                                        onChange={(e) =>
                                          setCategoriaBusqueda(e.target.value)
                                        }
                                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                      />
                                    </div>
                                    {/* Lista filtrada */}
                                    <ul className="max-h-36 overflow-y-auto py-1 text-sm">
                                      {categorias
                                        .filter((c) =>
                                          c.name
                                            .toLowerCase()
                                            .includes(
                                              categoriaBusqueda.toLowerCase(),
                                            ),
                                        )
                                        .map((item) => (
                                          <li
                                            key={item.id}
                                            onClick={() => {
                                              handleCategoriaChange({
                                                target: {
                                                  value: String(item.id),
                                                },
                                              });
                                              setCategoriaAbierta(false);
                                              setCategoriaBusqueda("");
                                            }}
                                            className={`cursor-pointer px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors ${String(item.id) === categoriaSelectedId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                                          >
                                            {item.name}
                                          </li>
                                        ))}
                                      {categorias.filter((c) =>
                                        c.name
                                          .toLowerCase()
                                          .includes(
                                            categoriaBusqueda.toLowerCase(),
                                          ),
                                      ).length === 0 && (
                                        <li className="px-3 py-2 text-slate-400 text-center">
                                          Sin resultados
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={selectReadOnlyClass}>
                                {categoriaSelectedId
                                  ? (categorias.find(
                                      (c) =>
                                        String(c.id) === categoriaSelectedId,
                                    )?.name ?? formData.categoria)
                                  : formData.categoria || "—"}
                              </div>
                            )}
                          </label>
                          <label className={labelClass}>
                            Centro de costo
                            <select
                              value={centroSelectedId}
                              onChange={handleCentroCostoChange}
                              disabled={!isEditing}
                              className={
                                isEditing ? inputClass : selectReadOnlyClass
                              }
                            >
                              <option value="">
                                Selecciona un centro de costo
                              </option>
                              {centrosCosto.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.consumidor || item.name}
                                </option>
                              ))}
                              {!centroSelectedId && formData.centroCosto && (
                                <option value="__current__">
                                  {formData.centroCosto}
                                </option>
                              )}
                            </select>
                          </label>
                          <label className={labelClass}>
                            Tipo de gasto
                            <input
                              name="tipogasto"
                              value={formData.tipogasto}
                              readOnly
                              className={inputReadOnlyClass}
                            />
                          </label>
                        </div></div>
                      </section>

                      <section className={`${sectionClass} ${activeTab !== "comprobante" ? "hidden sm:block" : "block"}`}>
                        <h3 className={sectionTitleClass}><span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />Datos del Comprobante</h3>
                        <div className={sectionBodyClass}><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <label className={labelClass}>
                            RUC Cliente:
                            <input
                              type="text"
                              name="rucCliente"
                              value={formData.rucCliente}
                              onChange={handleChange}
                              readOnly
                              className={inputReadOnlyClass}
                            />
                          </label>

                          {!isPlanillaMovilidad && (
                            <>
                              <label className={labelClass}>
                                Tipo Comprobante:
                                <select
                                  value={tipoComprobanteSelectedId}
                                  onChange={handleTipoComprobanteChange}
                                  disabled={!isEditing}
                                  className={
                                    isEditing ? inputClass : selectReadOnlyClass
                                  }
                                >
                                  <option value="">Seleccionar</option>
                                  {tiposComprobante.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                  {!tipoComprobanteSelectedId &&
                                    formData.tipoComprobante && (
                                      <option value="__current__">
                                        {formData.tipoComprobante}
                                      </option>
                                    )}
                                </select>
                              </label>
                              {/* Movil: RUC en una sola fila (2 columnas). Tablet/PC: en fila con mayor ancho para evitar cortes. */}
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:col-span-2 sm:gap-3 lg:col-span-2">
                                <label className={labelClass}>
                                  RUC Emisor:
                                  <input
                                    type="text"
                                    name="rucEmisor"
                                    value={formData.rucEmisor}
                                    onChange={handleChange}
                                    onKeyDown={handleRucEmisorKeyDown}
                                    readOnly={!isEditing}
                                    className={
                                      isEditing
                                        ? inputClass
                                        : inputReadOnlyClass
                                    }
                                  />
                                </label>
                              </div>

                              <label className={`${labelClass} lg:col-span-3`}>
                                Razon Social:
                                <input
                                  type="text"
                                  name="razonSocial"
                                  value={formData.razonSocial}
                                  onChange={handleChange}
                                  readOnly={!isEditing}
                                  className={
                                    isEditing ? inputClass : inputReadOnlyClass
                                  }
                                />
                              </label>
                              {/* Movil: Serie y Numero en una sola fila. Tablet/PC: en fila con mayor ancho. */}
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:col-span-2 sm:gap-3 lg:col-span-2">
                                <label className={labelClass}>
                                  Serie:
                                  <input
                                    type="text"
                                    name="serie"
                                    value={formData.serie}
                                    onChange={handleChange}
                                    readOnly={!isEditing}
                                    className={
                                      isEditing
                                        ? inputClass
                                        : inputReadOnlyClass
                                    }
                                  />
                                </label>
                                <label className={labelClass}>
                                  Numero:
                                  <input
                                    type="text"
                                    name="numero"
                                    value={formData.numero}
                                    onChange={handleChange}
                                    readOnly={!isEditing}
                                    className={
                                      isEditing
                                        ? inputClass
                                        : inputReadOnlyClass
                                    }
                                  />
                                </label>
                              </div>
                            </>
                          )}

                          {isPlanillaMovilidad && (
                            <>
                              <label className={labelClass}>
                                Origen:
                                <input
                                  type="text"
                                  name="origen"
                                  value={formData.origen || ""}
                                  onChange={handleChange}
                                  readOnly={!isEditing}
                                  className={
                                    isEditing ? inputClass : inputReadOnlyClass
                                  }
                                />
                              </label>
                              <label className={labelClass}>
                                Destino:
                                <input
                                  type="text"
                                  name="destino"
                                  value={formData.destino || ""}
                                  onChange={handleChange}
                                  readOnly={!isEditing}
                                  className={
                                    isEditing ? inputClass : inputReadOnlyClass
                                  }
                                />
                              </label>
                              <label
                                className={`${labelClass} sm:col-span-2 lg:col-span-3`}
                              >
                                Motivo de viaje:
                                <textarea
                                  rows={2}
                                  name="motivoViaje"
                                  value={formData.motivoViaje || ""}
                                  onChange={handleChange}
                                  readOnly={!isEditing}
                                  className={`${isEditing ? inputClass : inputReadOnlyClass} resize-none`}
                                />
                              </label>
                              <label className={labelClass}>
                                Tipo de movilidad:
                                <select
                                  name="tipoMovilidad"
                                  value={formData.tipoMovilidad || ""}
                                  onChange={handleChange}
                                  disabled={!isEditing}
                                  className={
                                    isEditing ? inputClass : selectReadOnlyClass
                                  }
                                >
                                  <option value="">
                                    Seleccionar tipo de movilidad
                                  </option>
                                  {tiposMovilidad.map((item) => (
                                    <option key={item.id} value={item.name}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className={labelClass}>
                                Placa:
                                <input
                                  type="text"
                                  name="placa"
                                  value={formData.placa || ""}
                                  onChange={handleChange}
                                  readOnly={!isEditing}
                                  className={
                                    isEditing ? inputClass : inputReadOnlyClass
                                  }
                                />
                              </label>
                            </>
                          )}

                          <label className={labelClass}>
                            Fecha:
                            <input
                              type="date"
                              name="fecha"
                              value={formData.fecha}
                              onChange={handleChange}
                              readOnly={!isEditing}
                              className={
                                isEditing ? inputClass : inputReadOnlyClass
                              }
                            />
                          </label>

                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:col-span-2 sm:gap-3 lg:col-span-2">
                            <label className={labelClass}>
                              IGV:
                              <input
                                type="number"
                                step="0.01"
                                name="igv"
                                value={formData.igv}
                                onChange={handleChange}
                                readOnly={!isEditing}
                                className={
                                  isEditing ? inputClass : inputReadOnlyClass
                                }
                              />
                            </label>
                            <label className={labelClass}>
                              Total:
                              <input
                                type="number"
                                step="0.01"
                                name="total"
                                value={formData.total}
                                onChange={handleChange}
                                readOnly={!isEditing}
                                className={
                                  isEditing ? inputClass : inputReadOnlyClass
                                }
                              />
                            </label>
                            <label className={labelClass}>
                              Moneda:
                              <select
                                value={monedaSelectedId}
                                onChange={handleMonedaChange}
                                disabled={!isEditing}
                                className={
                                  isEditing ? inputClass : selectReadOnlyClass
                                }
                              >
                                <option value="">Seleccionar</option>
                                <option value="01">PEN</option>
                                <option value="03">USD</option>
                              </select>
                            </label>
                          </div>

                          <label
                            className={`${labelClass} sm:col-span-2 lg:col-span-3`}
                          >
                            Nota u obs de gasto
                            <textarea
                              name="glosa"
                              rows="4"
                              value={formData.glosa}
                              onChange={handleChange}
                              readOnly={!isEditing}
                              className={`${isEditing ? inputClass : inputReadOnlyClass} resize-none`}
                            />
                          </label>
                        </div></div>
                      </section>
                    </div>

                    <aside className={`space-y-4 lg:h-fit lg:self-start ${activeTab !== "evidencia" ? "hidden sm:block" : "block"}`}>
                      <section className={sectionClass}>
                        <h3 className={sectionTitleClass}><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Evidencia</h3>
                        <div className={sectionBodyClass}><button
                          type="button"
                          onClick={handleOpenEvidenciaChangeModal}
                          disabled={!isEditing}
                          className={
                            isEditing
                              ? "mb-4 w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer"
                              : "mb-4 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed opacity-60"
                          }
                        >
                          Cambiar evidencia
                        </button>
                        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                          {evidenciaVisibleSrc ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Vista previa nueva
                              </p>
                              <img
                                src={evidenciaVisibleSrc}
                                alt="Evidencia del gasto"
                                className="max-h-[55vh] w-full rounded-xl border border-slate-200 object-contain bg-white"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <EvidenciaImagen
                              key={`${gasto?.id || gasto?.idrend || gasto?.evidenciaPath || gasto?.evidenciaFileName || formData.obs || "evidencia"}`}
                              gasto={gasto}
                              fallbackObs={formData.obs}
                              alt="Evidencia del gasto"
                              className="max-h-[55vh] w-full rounded-xl border border-slate-200 object-contain bg-white"
                              fallback={
                                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
                                  No hay evidencia registrada para este gasto.
                                </p>
                              }
                            />
                          )}
                        </div></div>
                      </section>
                    </aside>
                  </div>

                </form>

                {/* Modal para cambiar evidencia */}
                {showEvidenciaModal && (
                  <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
                      {/* Header */}
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                            <svg
                              className="h-4 w-4 text-blue-600"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">
                            Cambiar evidencia
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={handleCloseEvidenciaModal}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-4 p-5">
                        {error && (
                          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                          </p>
                        )}

                        {/* Vista previa */}
                        {newEvidenciaPreviewUrl && (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            {/* Barra superior: título + controles de zoom */}
                            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5">
                              <span className="text-xs font-semibold text-slate-500">
                                Vista previa
                              </span>
                              {newEvidencia?.type?.startsWith("image/") && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setZoomPreview((z) =>
                                        Math.max(0.5, +(z - 0.25).toFixed(2)),
                                      )
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-base font-bold"
                                  >
                                    −
                                  </button>
                                  <span className="min-w-[36px] text-center text-xs font-medium text-slate-500">
                                    {Math.round(zoomPreview * 100)}%
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setZoomPreview((z) =>
                                        Math.min(4, +(z + 0.25).toFixed(2)),
                                      )
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-base font-bold"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setZoomPreview(1); setPanOffset({ x: 0, y: 0 }); }}
                                    className="ml-1 rounded-md px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                  >
                                    Reset
                                  </button>
                                </div>
                              )}
                            </div>

                            {newEvidencia?.type?.startsWith("image/") ? (
                              <div
                                className="relative h-64 overflow-hidden select-none bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]"
                                style={{ cursor: isDraggingRef.current ? "grabbing" : "grab" }}
                                onWheel={(e) => {
                                  e.preventDefault();
                                  setZoomPreview((z) =>
                                    Math.min(4, Math.max(0.5, +(z - e.deltaY * 0.001).toFixed(2)))
                                  );
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  isDraggingRef.current = true;
                                  lastMouseRef.current = { x: e.clientX, y: e.clientY };
                                  e.currentTarget.style.cursor = "grabbing";
                                }}
                                onMouseMove={(e) => {
                                  if (!isDraggingRef.current) return;
                                  const dx = e.clientX - lastMouseRef.current.x;
                                  const dy = e.clientY - lastMouseRef.current.y;
                                  lastMouseRef.current = { x: e.clientX, y: e.clientY };
                                  setPanOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
                                }}
                                onMouseUp={(e) => {
                                  isDraggingRef.current = false;
                                  e.currentTarget.style.cursor = "grab";
                                }}
                                onMouseLeave={(e) => {
                                  isDraggingRef.current = false;
                                  e.currentTarget.style.cursor = "grab";
                                }}
                              >
                                <img
                                  src={newEvidenciaPreviewUrl}
                                  alt="Vista previa"
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    maxHeight: "240px",
                                    width: "auto",
                                    transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoomPreview})`,
                                    transformOrigin: "center",
                                    transition: isDraggingRef.current ? "none" : "transform 0.15s ease",
                                  }}
                                  className="rounded object-contain shadow-sm"
                                  draggable={false}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 px-4 py-4">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                                  <svg
                                    className="h-5 w-5 text-red-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="9" y1="13" x2="15" y2="13" />
                                    <line x1="9" y1="17" x2="15" y2="17" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-700">
                                    {newEvidencia?.name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    PDF ·{" "}
                                    {newEvidencia?.size
                                      ? `${(newEvidencia.size / 1024).toFixed(0)} KB`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Uploader / converting spinner */}
                        {isConvertingPdf ? (
                          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 py-8">
                            <svg className="h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <p className="text-sm font-medium text-blue-600">Convirtiendo PDF a imagen…</p>
                            <p className="text-xs text-blue-400">Esto puede tardar unos segundos</p>
                          </div>
                        ) : (
                          <EvidenciaUploader
                            labelClass={labelClass}
                            formData={{ evidencia: newEvidencia }}
                            hasEvidencia={!!newEvidencia}
                            canCropImage={newEvidencia?.type?.startsWith(
                              "image/",
                            )}
                            onFileChange={handleEvidenciaFileChange}
                            onOpenPreview={() => {}}
                            onStartCrop={handleStartEvidenciaCrop}
                          />
                        )}

                        {/* Acciones */}
                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={handleCloseEvidenciaModal}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewEvidencia}
                            disabled={!newEvidencia || isEvidenciaSaving || isConvertingPdf}
                            className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto cursor-pointer"
                          >
                            {isEvidenciaSaving
                              ? "Listo..."
                              : "Cambiar evidencia"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <EvidenciaCropModal
                  isOpen={showEvidenciaModal && isEvidenciaCropMode}
                  hasEvidencia={!!newEvidencia}
                  canCropImage={newEvidencia?.type?.startsWith("image/")}
                  isCropMode={isEvidenciaCropMode}
                  onClose={handleCancelEvidenciaCrop}
                  onStartCrop={handleStartEvidenciaCrop}
                  onCancelCrop={handleCancelEvidenciaCrop}
                  onApplyCrop={handleApplyEvidenciaCrop}
                  previewUrl={newEvidenciaPreviewUrl}
                  fileName={newEvidencia?.name}
                  crop={evidenciaCrop}
                  onChangeCrop={setEvidenciaCrop}
                  onCompleteCrop={handleCompleteEvidenciaCrop}
                  selectedAspect={
                    cropPresets.find(
                      (item) => item.key === selectedEvidenciaPreset,
                    )?.aspect
                  }
                  cropShape={evidenciaCropShape}
                  onImageLoaded={handleImageLoaded}
                  selectedPreset={selectedEvidenciaPreset}
                  onSelectPreset={handleChangeEvidenciaPreset}
                  cropPresets={cropPresets}
                  onSetCropShape={handleSetEvidenciaCropShape}
                  onReset={handleResetEvidenciaCrop}
                />
              </div>

              {/* Barra de acciones — solo desktop */}
              <div className="hidden sm:flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-5 py-2.5">
                {/* Metadata izquierda */}
                <div className="flex items-center gap-2">
                  {error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>
                  )}
                  {!error && (
                    <span className="text-[10px] text-slate-400">
                      Rendición <span className="font-semibold text-slate-500">#{String(gasto?.idrend || gasto?.id || "—")}</span>
                    </span>
                  )}
                </div>
                {/* Botones derecha */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cerrar
                  </button>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 active:scale-95 cursor-pointer"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSaving || !isEditing}
                    onClick={handleSubmit}
                    className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-700 px-4 text-xs font-bold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5 shrink-0" />
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        modalRoot,
      )
    : null;
}
