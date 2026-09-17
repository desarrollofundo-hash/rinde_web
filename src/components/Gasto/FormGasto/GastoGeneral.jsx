import { useCallback, useEffect, useRef, useState } from "react";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf.mjs";
import { getDropdownOptionsPolitica } from "../../../services/politica";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).href;
import { getDropdownOptionsCategoria } from "../../../services/categoria";
import { getDropdownOptionsCentroCosto } from "../../../services/centrocosto";
import { getDropdownOptionsTipoGasto } from "../../../services/tipogasto";
import { getDropdownOptionsTipoComprobante } from "../../../services/tipocomprobante";
import { saveRendicionGasto } from "../../../services/save/saveGasto";
import { saveDetalleGasto } from "../../../services/save_detalle/saveGastoDetalle";
import { saveEvidenciaGasto } from "../../../services/evidencia";
import { getApiRuc } from "../../../services/ruc/api_ruc";
import { extraerDatosComprobante } from "../../../services/ocrExtraction";
import EvidenciaUploader from "./EvidenciaUploader";
import EvidenciaCropModal from "./EvidenciaCropModal";
import QrScannerModal from "./QrScannerModal";
import OcrScannerModal from "./OcrScannerModal";
import RucValidationDialog from "./RucValidationDialog";
import UploadWarningMessage from "./UploadWarningMessage";
import Toast from "../../shared/Toast.jsx";
import RiveAnimation from "../../RiveAnimation";
import { Save, QrCode, Camera } from "lucide-react";

const getUserDni = (user) => {
  if (!user || typeof user !== "object") return "";

  const candidates = [
    user.dni,
    user.DNI,
    user.usedoc,
    user.nrodoc,
    user.numdoc,
    user.documento,
    user.docident,
    user.doc,
    user.usuario,
  ];

  const dni = candidates.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

  return dni ? String(dni).trim() : "";
};

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

const normalizeQrDate = (value) => {
  const dateText = String(value || "").trim();
  if (!dateText) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return dateText;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateText)) {
    const [dd, mm, yyyy] = dateText.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateText)) {
    return dateText.replaceAll("/", "-");
  }

  return "";
};

const getLocalIsoDateTime = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 23);
};

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const normalizeRuc = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .trim();

const resolveTipoGastoFromCentroCosto = (centroCosto) => {
  const raw = centroCosto?.raw ?? centroCosto ?? {};
  const metadata = raw?.metadata ?? centroCosto?.metadata ?? {};

  const candidates = [
    metadata.tipogasto,
    metadata.tipoGasto,
    raw.tipogasto,
    raw.tipoGasto,
    raw.nomtipogasto,
    raw.tipoGastoDesc,
    raw.descripcionTipoGasto,
    raw.consumidor,
    centroCosto?.name,
    centroCosto?.consumidor,
  ];

  const resolved = candidates.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );
  return resolved ? String(resolved).trim() : "";
};

const INITIAL_FORM_DATA = {
  dni: "",
  politica: "",
  categoria: "",
  centroCosto: "",
  tipoGasto: "",
  rucEmisor: "",
  razonSocial: "",
  proveedor: "",
  tipoComprobante: "01",
  serie: "",
  numeroSerie: "",
  numero: "",
  igv: "",
  fecha: "",
  total: "",
  moneda: "01",
  rucCliente: "",
  gerencia: "",
  consumidor: "",
  placa: "",
  glosa: "",
  obs1: "",
  evidencia: null,
};

const FALLBACK_TIPOS_COMPROBANTE = [
  { id: "01", name: "FACTURA ELECTRONICA" },
  { id: "03", name: "BOLETA DE VENTA" },
  { id: "07", name: "NOTA DE CREDITO" },
  { id: "08", name: "NOTA DE DEBITO" },
  { id: "10", name: "RECIBO POR HONORARIO" },
  { id: "11", name: "OTROS" },
];

const parseQrPayload = (rawText) => {
  const payload = String(rawText || "").trim();
  if (!payload) return {};

  try {
    const json = JSON.parse(payload);
    return {
      rucEmisor: String(json.ruc || json.rucEmisor || json.RUC || ""),
      tipoComprobante: String(
        json.tipoComprobante || json.tipocomprobante || json.tipo || "",
      ),
      serie: String(json.serie || ""),
      numero: String(json.numero || json.correlativo || ""),
      igv: String(json.igv || ""),
      total: String(json.total || json.monto || ""),
      fecha: normalizeQrDate(json.fecha || json.fechaEmision || ""),
      rucCliente: String(json.rucCliente || json.rucReceptor || ""),
      razonSocial: String(
        json.razonSocial ||
          json.razonsocial ||
          json.nombre ||
          json.nombreComercial ||
          json.proveedor ||
          "",
      ),
      proveedor: String(
        json.proveedor || json.nombre || json.razonSocial || "",
      ),
    };
  } catch {
    const parts = payload.split("|").map((item) => item.trim());
    if (parts.length < 4) {
      return {};
    }

    return {
      rucEmisor: String(parts[0] || ""),
      tipoComprobante: String(parts[1] || ""),
      serie: String(parts[2] || ""),
      numero: String(parts[3] || ""),
      igv: String(parts[4] || ""),
      total: String(parts[5] || ""),
      fecha: normalizeQrDate(parts[6] || ""),
      rucCliente: String(parts[8] || ""),
      razonSocial: "",
      proveedor: "",
    };
  }
};

const buildPayloadCabeceraGeneral = ({
  formData,
  userId,
  dniToSend,
  empresa,
  politicaSeleccionada,
  categoriaSeleccionada,
  resolvedIdCuenta,
  resolvedConsumidor,
  resolvedTipoGasto,
  tipoComprobanteDescripcion,
  monedaDescripcion,
  igvNumber,
  totalNumber,
  nowIso,
}) => {
  // comentario: nota libre que el usuario escribe en el campo "Glosa" del formulario.
  // Va siempre en la columna "obs" (obsCabecera) del primer API; "glosa" es un valor imputable fijo.
  const comentario = String(formData.glosa || "").trim();

  return {
    idUser: Number(userId) || 0,
    dni: dniToSend,
    politica: String(politicaSeleccionada?.name ?? formData.politica),
    categoria: String(categoriaSeleccionada?.name ?? formData.categoria),
    tipogasto: String(resolvedTipoGasto),
    idCuenta: resolvedIdCuenta,
    consumidor: resolvedConsumidor,
    ruc: String(formData.rucEmisor || ""),
    rucCliente: String(formData.rucCliente || ""),
    desEmp: String(empresa?.nombre || empresa?.empresa || ""),
    desSed: "",
    gerencia: String(empresa?.gerencia || ""),
    area: String(empresa?.area || ""),
    proveedor: String(formData.razonSocial || formData.proveedor || ""),
    tipoCombrobante: tipoComprobanteDescripcion,
    serie: String(formData.serie),
    numero: String(formData.numero),
    fecha: String(formData.fecha || ""),
    igv: Number.isFinite(igvNumber) ? igvNumber : 0,
    total: Number.isFinite(totalNumber) ? totalNumber : 0,
    moneda: monedaDescripcion,
    estadoActual: "BORRADOR",
    glosa: "CREAR GASTO",
    motivoViaje: "",
    lugarOrigen: "",
    lugarDestino: "",
    tipoMovilidad: "",
    // obsCabecera: columna "obs" del primer API, siempre igual al comentario del front.
    obs: comentario,
    estado: "S",
    fecCre: nowIso,
    useReg: Number(userId) || 0,
    hostname: "WEB",
    fecEdit: nowIso,
    useEdit: 0,
    useElim: 0,
  };
};

const buildPayloadDetalleGeneral = ({
  payloadCabecera,
  formData,
  empresa,
  dniToSend,
  resolvedIdCuenta,
  resolvedConsumidor,
  responseCabecera,
  nowIso,
}) => {
  // comentario: mismo valor que la cabecera (campo "Glosa" del front), nunca la ruta de evidencia.
  const comentario = String(formData.glosa || "").trim();

  return {
    // Reenviar bloque completo para evitar que updaterendiciongasto pise columnas en null.
    ...payloadCabecera,
    idRend: String(responseCabecera),
    idrend: String(responseCabecera),
    fecEdit: nowIso,
    useEdit: 0,
    idcuenta: resolvedIdCuenta,
    consumidor: resolvedConsumidor,
    dni: dniToSend,
    gerencia: String(empresa?.gerencia || formData.gerencia || ""),
    placa: String(formData.placa || ""),
    // obsCabecera: siempre el comentario, no se sobreescribe con la ruta de evidencia.
    obs: comentario,
  };
};

export default function GastoGeneral({
  selectedPolitica: selectedPoliticaProp = null,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [politicas, setPoliticas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [_tiposGasto, setTiposGasto] = useState([]);
  const [tiposComprobante, setTiposComprobante] = useState(
    FALLBACK_TIPOS_COMPROBANTE,
  );
  const [evidenciaPreviewUrl, setEvidenciaPreviewUrl] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("doc");
  const [cropShape, setCropShape] = useState("rect");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [rucValidationDialog, setRucValidationDialog] = useState({
    isOpen: false,
    rucClienteOcr: "",
    rucEmpresa: "",
    razonSocialOcr: "",
    razonSocialEmpresa: "",
    onConfirm: null,
  });
  const [evidenciaInputResetKey, setEvidenciaInputResetKey] = useState(0);
  const [toastConfig, setToastConfig] = useState({
    isVisible: false,
    message: "",
    type: "success",
  });
  const [facturaDuplicadaDialog, setFacturaDuplicadaDialog] = useState({
    isOpen: false,
    message: "",
  });

  const [movilidadMontoDialog, setMovilidadMontoDialog] = useState({
    isOpen: false,
    message: "",
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageCropRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToastConfig({ isVisible: true, message, type });
  };

  const closeToast = () => {
    setToastConfig((prev) => ({ ...prev, isVisible: false }));
  };

  const handleOpenCamera = async () => {
    try {
      setIsCameraOpen(true);
      setTimeout(async () => {
        if (videoRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            });
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          } catch (err) {
            console.error("Error con facingMode environment:", err);
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
              });
              videoRef.current.srcObject = stream;
              await videoRef.current.play().catch(() => {});
            } catch (fallbackErr) {
              console.error("Error al acceder a la cámara:", fallbackErr);
              showToast("No se pudo acceder a la cámara", "error");
              setIsCameraOpen(false);
            }
          }
        }
      }, 300);
    } catch (err) {
      console.error("Error:", err);
      showToast("Error al abrir la cámara", "error");
      setIsCameraOpen(false);
    }
  };

  const handleCaptureFoto = () => {
    if (videoRef.current && canvasRef.current) {
      try {
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) {
          showToast("Error: no se pudo obtener contexto del canvas", "error");
          return;
        }

        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        if (!videoWidth || !videoHeight) {
          showToast("Error: video no está listo", "error");
          return;
        }

        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob(
          async (blob) => {
            if (!blob) {
              showToast("Error al capturar la foto", "error");
              return;
            }

            const file = new File([blob], "captura_camara.jpg", {
              type: "image/jpeg",
            });

            setFormData((prev) => ({ ...prev, evidencia: file }));
            setEvidenciaPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
            showToast("Procesando foto con OCR...", "info");

            setTimeout(async () => {
              try {
                console.log(
                  "📸 Enviando foto para OCR:",
                  file.name,
                  file.type,
                  file.size,
                );
                showToast("Enviando a OpenAI...", "info");
                const datos = await extraerDatosComprobante(file);
                console.log("✅ OCR completado:", datos);
                if (datos) {
                  showToast("Datos extraídos exitosamente", "success");
                  setFormData((prev) => ({
                    ...prev,
                    rucEmisor: datos.rucEmisor || "",
                    razonSocial: datos.razonSocial || "",
                    rucCliente: datos.rucCliente || "",
                    tipoComprobante: datos.tipoComprobante || "01",
                    serie: datos.serie || "",
                    numero: datos.numero || "",
                    fecha: datos.fecha || "",
                    total: datos.total || "",
                    moneda: datos.moneda || "01",
                    igv: datos.igv || "",
                  }));
                } else {
                  showToast("⚠️ No se extrajeron datos", "warning");
                }
              } catch (err) {
                console.error("❌ Error OCR:", err);
                const errorMsg = err?.message || String(err);
                showToast(`❌ Error: ${errorMsg.substring(0, 100)}`, "error");
              }
            }, 1000);
          },
          "image/jpeg",
          0.9,
        );
      } catch (err) {
        console.error("Error capturando foto:", err);
        showToast("Error al capturar la foto", "error");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setIsCameraOpen(false);
  };

  const loadCentrosCosto = useCallback(async () => {
    const rawUser = localStorage.getItem("user");
    const rawEmpresa =
      localStorage.getItem("company") || localStorage.getItem("empresa");

    if (!rawUser || !rawEmpresa) {
      throw new Error("No hay sesion completa para cargar centros de costo");
    }

    const user = JSON.parse(rawUser);
    const empresa = JSON.parse(rawEmpresa);

    const iduser = user?.usecod ?? user?.iduser ?? user?.id;
    const empresaNombre = empresa?.empresa ?? empresa?.nombre ?? empresa?.name;

    if (!iduser || !empresaNombre) {
      throw new Error(
        "Faltan datos de usuario o empresa para centros de costo",
      );
    }

    const centrosData = await getDropdownOptionsCentroCosto({
      iduser: String(iduser),
      empresa: String(empresaNombre),
    });
    setCentrosCosto(centrosData);
  }, []);

  const loadTiposGasto = async () => {
    const tiposData = await getDropdownOptionsTipoGasto();
    /* console.log("🔥 Tipos de gasto:", tiposData); */
    setTiposGasto(tiposData);
  };

  const loadTiposComprobante = useCallback(async () => {
    try {
      const tiposData = await getDropdownOptionsTipoComprobante();
      if (Array.isArray(tiposData) && tiposData.length > 0) {
        setTiposComprobante(tiposData);
      } else {
        setTiposComprobante(FALLBACK_TIPOS_COMPROBANTE);
      }
    } catch (error) {
      console.error("Error cargando tipos de comprobante:", error);
      setTiposComprobante(FALLBACK_TIPOS_COMPROBANTE);
    }
  }, []);

  //PDF CONVIERTE A IMAGEN
  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    if (files) {
      let selectedFile = files[0] || null;

      if (name === "evidencia" && isPdfFile(selectedFile)) {
        try {
          selectedFile = await convertPdfToImageFile(selectedFile);
          showToast("El PDF se convirtió a imagen para su guardado", "success");
        } catch (error) {
          console.error("No se pudo convertir el PDF a imagen", error);
          showToast("No se pudo convertir el PDF a imagen", "error");
          return;
        }
      }

      setFormData((prev) => ({
        ...prev,
        [name]: selectedFile,
      }));

      if (name === "evidencia") {
        if (evidenciaPreviewUrl) {
          URL.revokeObjectURL(evidenciaPreviewUrl);
        }

        if (selectedFile) {
          setEvidenciaPreviewUrl(URL.createObjectURL(selectedFile));
          setCrop(undefined);
          setCompletedCrop(null);
          setSelectedPreset("doc");
          setCropShape("rect");
        } else {
          setEvidenciaPreviewUrl("");
        }
      }

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectedAspect =
    cropPresets.find((item) => item.key === selectedPreset)?.aspect || 4 / 3;

  const handleResetCropState = () => {
    if (imageCropRef.current) {
      setCrop(
        createInitialCrop(
          imageCropRef.current.width,
          imageCropRef.current.height,
          selectedAspect,
        ),
      );
      setCompletedCrop(null);
    } else {
      setCrop(undefined);
      setCompletedCrop(null);
    }
    setSelectedPreset("doc");
    setCropShape("rect");
  };

  const handleImageLoaded = useCallback(
    (event) => {
      const image = event.currentTarget;
      imageCropRef.current = image;
      setCrop(createInitialCrop(image.width, image.height, selectedAspect));
      setCompletedCrop(null);
    },
    [selectedAspect],
  );

  const handleChangePreset = (presetKey) => {
    const presetAspect =
      cropPresets.find((item) => item.key === presetKey)?.aspect || null;
    setSelectedPreset(presetKey);

    if (imageCropRef.current) {
      setCrop(
        createInitialCrop(
          imageCropRef.current.width,
          imageCropRef.current.height,
          presetAspect,
        ),
      );
      setCompletedCrop(null);
    }
  };

  const handleApplyCrop = async () => {
    if (!formData.evidencia || !completedCrop || !imageCropRef.current) return;

    try {
      const croppedFile = await getCroppedFile(
        imageCropRef.current,
        completedCrop,
        formData.evidencia,
      );

      if (evidenciaPreviewUrl) {
        URL.revokeObjectURL(evidenciaPreviewUrl);
      }

      const newPreview = URL.createObjectURL(croppedFile);
      setFormData((prev) => ({ ...prev, evidencia: croppedFile }));
      setEvidenciaPreviewUrl(newPreview);
      setIsCropMode(false);
    } catch (error) {
      /* console.error("❌ Error recortando imagen:", error); */
      showToast("No se pudo recortar la imagen", "error");
    }
  };

  const handleQrDetected = async (decodedText) => {
    const parsed = parseQrPayload(decodedText);
    const rucEmisorLimpio = String(parsed.rucEmisor || "").replace(/\D/g, "");
    const razonSocialQr = String(parsed.razonSocial || "").trim();
    const proveedorQr = String(parsed.proveedor || "").trim();
    const razonSocialInicial = razonSocialQr || proveedorQr;

    setFormData((prev) => ({
      ...prev,
      rucEmisor: rucEmisorLimpio || prev.rucEmisor,
      tipoComprobante: parsed.tipoComprobante || prev.tipoComprobante,
      serie: parsed.serie || prev.serie,
      numero: parsed.numero || prev.numero,
      igv: parsed.igv || prev.igv,
      total: parsed.total || prev.total,
      fecha: parsed.fecha || prev.fecha,
      rucCliente: parsed.rucCliente || prev.rucCliente,
      razonSocial: razonSocialInicial || prev.razonSocial,
      proveedor: razonSocialInicial || prev.proveedor,
    }));

    if (!razonSocialInicial && /^\d{11}$/.test(rucEmisorLimpio)) {
      try {
        const data = await getApiRuc({ ruc: rucEmisorLimpio });
        const razonSocial =
          data?.razonSocial ||
          data?.nombre_o_razon_social ||
          data?.nombreORazonSocial ||
          data?.nombre ||
          data?.nombreComercial ||
          data?.nombreComercialSunat ||
          "";

        if (razonSocial) {
          setFormData((prev) => ({
            ...prev,
            razonSocial,
            proveedor: razonSocial,
          }));
        }
      } catch (error) {
        /* console.error("No se pudo autocompletar razon social por RUC:", error); */
      }
    }

    showToast(
      "QR escaneado. Se autocompletaron los datos detectados",
      "success",
    );
  };

  const getRucEmpresaSesion = useCallback(() => {
    // IMPORTANTE: Siempre leer FRESCO del localStorage, nunca cachear
    // para capturar cambios de empresa en tiempo real
    try {
      const rawEmpresa =
        localStorage.getItem("company") || localStorage.getItem("empresa");
      if (!rawEmpresa) return "";

      const empresa = JSON.parse(rawEmpresa);
      return normalizeRuc(
        empresa?.ruc ??
          empresa?.RUC ??
          empresa?.numRuc ??
          empresa?.rucCliente ??
          empresa?.ruccliente,
      );
    } catch (error) {
      console.warn(
        "⚠️ Error al leer RUC de empresa desde localStorage:",
        error,
      );
      return "";
    }
  }, []);

  const completarConDatosOcr = async (datosOcr) => {
    const rucEmisorLimpio = String(datosOcr.rucEmisor || "").replace(/\D/g, "");
    const rucClienteLimpio = String(datosOcr.rucCliente || "").replace(
      /\D/g,
      "",
    );
    const razonSocialOcr = String(datosOcr.razonSocial || "").trim();

    setFormData((prev) => ({
      ...prev,
      rucEmisor: rucEmisorLimpio || prev.rucEmisor,
      tipoComprobante: datosOcr.tipoComprobante || prev.tipoComprobante,
      serie: datosOcr.serie || prev.serie,
      numero: datosOcr.numero || prev.numero,
      igv: datosOcr.igv || prev.igv,
      total: datosOcr.total || prev.total,
      fecha: datosOcr.fecha || prev.fecha,
      rucCliente: rucClienteLimpio || prev.rucCliente,
      razonSocial: razonSocialOcr || prev.razonSocial,
      proveedor: razonSocialOcr || prev.proveedor,
      moneda: datosOcr.moneda || prev.moneda,
    }));

    if (!razonSocialOcr && /^\d{11}$/.test(rucEmisorLimpio)) {
      try {
        const data = await getApiRuc({ ruc: rucEmisorLimpio });
        const razonSocial =
          data?.razonSocial ||
          data?.nombre_o_razon_social ||
          data?.nombreORazonSocial ||
          data?.nombre ||
          data?.nombreComercial ||
          data?.nombreComercialSunat ||
          "";

        if (razonSocial) {
          setFormData((prev) => ({
            ...prev,
            razonSocial,
            proveedor: razonSocial,
          }));
        }
      } catch (error) {
        /* console.error("No se pudo autocompletar razon social por RUC:", error); */
      }
    }

    showToast(
      "✅ Factura escaneada. Se autocompletaron los datos detectados",
      "success",
    );
  };

  const handleOcrDetected = async (datosOcr) => {
    const rucEmisorLimpio = String(datosOcr.rucEmisor || "").replace(/\D/g, "");
    const rucClienteOcr = String(datosOcr.rucCliente || "").replace(/\D/g, "");
    const razonSocialOcr = String(datosOcr.razonSocial || "").trim();

    // Validar que el RUC cliente de la factura coincida con la empresa logueada
    const rucEmpresa = getRucEmpresaSesion();

    // DEBUG: Mostrar valores con máximo detalle
    console.log("═══════════════════════════════════════");
    console.log("🔍 OCR VALIDACIÓN RUC - DATOS COMPLETOS:");
    console.log("═══════════════════════════════════════");
    console.log("📋 Del OCR extraído:", datosOcr);
    console.log(`  • rucEmisor (limpio): "${rucEmisorLimpio}"`);
    console.log(`  • rucCliente (limpio): "${rucClienteOcr}"`);
    console.log(`  • rucCliente (length): ${rucClienteOcr.length}`);
    console.log(`  • razonSocial: "${razonSocialOcr}"`);
    console.log("───────────────────────────────────────");
    console.log("🏢 De la empresa en sesión:");
    console.log(`  • rucEmpresa: "${rucEmpresa}"`);
    console.log(`  • rucEmpresa (length): ${rucEmpresa.length}`);
    console.log(
      `  • Tipos: OCR=${typeof rucClienteOcr} vs Empresa=${typeof rucEmpresa}`,
    );
    console.log("───────────────────────────────────────");

    // Validación: Solo si ambos RUC existen y son diferentes
    if (rucClienteOcr && rucEmpresa) {
      console.log("✅ Ambos RUC presentes - Comparando...");
      console.log(
        `Comparación: "${rucClienteOcr}" === "${rucEmpresa}" ? ${rucClienteOcr === rucEmpresa}`,
      );
      if (rucClienteOcr !== rucEmpresa) {
        console.warn(
          `❌ RUC NO COINCIDEN: "${rucClienteOcr}" !== "${rucEmpresa}"`,
        );

        // Obtener nombre de empresa logueada desde localStorage
        const rawEmpresa =
          localStorage.getItem("company") || localStorage.getItem("empresa");
        const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
        const nombreEmpresaLogueada =
          empresa?.razonSocial ||
          empresa?.nombreComercial ||
          empresa?.nombre ||
          empresa?.name ||
          "Empresa Desconocida";

        // Mostrar diálogo elegante en lugar de window.confirm()
        setRucValidationDialog({
          isOpen: true,
          rucClienteOcr,
          rucEmpresa,
          razonSocialOcr: datosOcr.razonSocialCliente || "Nombre no disponible",
          razonSocialEmpresa: nombreEmpresaLogueada,
          onConfirm: () => {
            console.log("✋ Usuario aceptó continuar con RUC diferente");
            completarConDatosOcr(datosOcr);
          },
        });
        return;
      } else {
        console.log("✅ RUC validado correctamente - coinciden perfectamente");
        completarConDatosOcr(datosOcr);
      }
    } else {
      // Si no hay empresa logueada, es un error crítico
      if (!rucEmpresa) {
        console.warn("❌ No se encontró empresa en sesión");
        showToast("Error: No hay empresa activa en sesión.", "error");
        return;
      }

      // Si falta rucCliente, usar el de la empresa logueada como fallback
      if (!rucClienteOcr) {
        console.warn(
          "⚠️ No se pudo extraer el RUC del Cliente de la factura, usando RUC de la empresa logueada como fallback",
        );
        console.log(`  • Usando como cliente: "${rucEmpresa}"`);

        // Usar el RUC de la empresa logueada como cliente
        completarConDatosOcr({ ...datosOcr, rucCliente: rucEmpresa });
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      rucEmisor: rucEmisorLimpio || prev.rucEmisor,
      tipoComprobante: datosOcr.tipoComprobante || prev.tipoComprobante,
      serie: datosOcr.serie || prev.serie,
      numero: datosOcr.numero || prev.numero,
      igv: datosOcr.igv || prev.igv,
      total: datosOcr.total || prev.total,
      fecha: datosOcr.fecha || prev.fecha,
      rucCliente: rucClienteOcr || prev.rucCliente,
      razonSocial: razonSocialOcr || prev.razonSocial,
      proveedor: razonSocialOcr || prev.proveedor,
      moneda: datosOcr.moneda || prev.moneda,
    }));

    if (!razonSocialOcr && /^\d{11}$/.test(rucEmisorLimpio)) {
      try {
        const data = await getApiRuc({ ruc: rucEmisorLimpio });
        const razonSocial =
          data?.razonSocial ||
          data?.nombre_o_razon_social ||
          data?.nombreORazonSocial ||
          data?.nombre ||
          data?.nombreComercial ||
          data?.nombreComercialSunat ||
          "";

        if (razonSocial) {
          setFormData((prev) => ({
            ...prev,
            razonSocial,
            proveedor: razonSocial,
          }));
        }
      } catch (error) {
        /* console.error("No se pudo autocompletar razon social por RUC:", error); */
      }
    }

    showToast(
      "Factura escaneada. Se autocompletaron los datos detectados",
      "success",
    );
  };

  const handleRucEmisorBlur = async () => {
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
        setFormData((prev) => ({
          ...prev,
          razonSocial,
          proveedor: razonSocial,
        }));
      }
    } catch (error) {
      /* console.error("❌ Error validando RUC emisor:", error.message); */
    }
  };

  const loadCategorias = useCallback(async (politica = "todos") => {
    const categoriasData = await getDropdownOptionsCategoria({ politica });
    setCategorias(categoriasData);

    setFormData((prev) => {
      if (
        prev.categoria &&
        categoriasData.some((c) => String(c.id) === String(prev.categoria))
      ) {
        return prev;
      }
      return { ...prev, categoria: "" };
    });
  }, []);

  const handlePoliticaChange = async (e) => {
    const politicaId = e.target.value;
    setCategorias([]);
    setFormData((prev) => ({
      ...prev,
      politica: politicaId,
      categoria: "",
    }));

    const politicaSeleccionada = politicas.find(
      (p) => String(p.id) === String(politicaId),
    );
    const politicaNombre = politicaSeleccionada?.name || "todos";

    try {
      await loadCategorias(politicaNombre);
    } catch (error) {
      console.error("Error cargando categorias por politica:", error);
      setCategorias([]);
    }
  };

  useEffect(() => {
    if (!selectedPoliticaProp) {
      return;
    }

    const politicaId = String(selectedPoliticaProp.id ?? "");
    const politicaNombre =
      String(selectedPoliticaProp.name ?? "todos").trim() || "todos";

    Promise.resolve().then(() => {
      setCategorias([]);

      setFormData((prev) => {
        if (String(prev.politica ?? "") === politicaId) {
          return prev;
        }

        return {
          ...prev,
          politica: politicaId,
          categoria: "",
        };
      });
    });

    Promise.resolve()
      .then(() => loadCategorias(politicaNombre))
      .catch((error) => {
        console.error(
          "Error cargando categorias por politica seleccionada:",
          error,
        );
        setCategorias([]);
      });
  }, [loadCategorias, politicas, selectedPoliticaProp]);

  const selectedCategoria = categorias.find(
    (categoria) => String(categoria.id) === String(formData.categoria),
  );
  const isPlanillaMovilidad = normalizeText(selectedCategoria?.name).includes(
    "PLANILLA DE MOVILIDAD",
  );

  useEffect(() => {
    if (!isPlanillaMovilidad || centrosCosto.length === 0) {
      return;
    }

    const centroAutomatico = centrosCosto[0];

    Promise.resolve().then(() => {
      setFormData((prev) => {
        const currentCentro = String(prev.centroCosto || "");
        const autoCentro = String(centroAutomatico?.id || "");

        if (currentCentro === autoCentro && prev.tipoGasto) {
          return prev;
        }

        return {
          ...prev,
          centroCosto: autoCentro,
          tipoGasto: resolveTipoGastoFromCentroCosto(centroAutomatico),
          consumidor:
            centroAutomatico?.consumidor || centroAutomatico?.name || "",
        };
      });
    });
  }, [centrosCosto, isPlanillaMovilidad]);

  const handleCentroCostoChange = (e) => {
    const { value } = e.target;
    const centroSeleccionado = centrosCosto.find(
      (cc) => String(cc.id) === String(value),
    );
    setFormData((prev) => ({
      ...prev,
      centroCosto: value,
      tipoGasto: resolveTipoGastoFromCentroCosto(centroSeleccionado),
      consumidor:
        centroSeleccionado?.consumidor || centroSeleccionado?.name || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      /* console.error("❌ No se ha encontrado el usuario en el localStorage."); */
      showToast(
        "Error de autenticación. Por favor, inicie sesión de nuevo.",
        "error",
      );
      return;
    }
    const user = JSON.parse(rawUser);
    const userId = user?.id ?? user?.usecod ?? user?.iduser;
    const userDni = getUserDni(user);
    const dniToSend = String(formData.dni || userDni || "").trim();
    const rawEmpresa =
      localStorage.getItem("company") || localStorage.getItem("empresa");
    const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;

    /*   const rucClienteFormulario = normalizeRuc(formData.rucCliente);
        const rucEmpresaSesion = normalizeRuc(empresa?.ruc ?? empresa?.RUC ?? empresa?.numRuc); */
    /*  if (!userId) {
        console.error("❌ No se ha encontrado el usuario en el localStorage o no tiene ID.");
            showToast("Error de autenticación. Por favor, inicie sesión de nuevo.", "error"); 
            return;
        }

        if (!rucClienteFormulario || !rucEmpresaSesion || rucClienteFormulario !== rucEmpresaSesion) {
            showToast("No se puede guardar: el RUC Cliente debe ser igual al RUC de la empresa logueada.", "error");
            return;
        } */

    try {
      const politicaSeleccionada = politicas.find(
        (p) => String(p.id) === String(formData.politica),
      );
      const categoriaSeleccionada = categorias.find(
        (c) => String(c.id) === String(formData.categoria),
      );
      const centroCostoSeleccionado = centrosCosto.find(
        (cc) => String(cc.id) === String(formData.centroCosto),
      );
      const resolvedIdCuenta = String(
        centroCostoSeleccionado?.id ||
          centroCostoSeleccionado?.raw?.idCuenta ||
          centroCostoSeleccionado?.raw?.idcuenta ||
          formData.centroCosto ||
          "",
      );
      const resolvedTipoGasto = String(
        formData.tipoGasto ||
          resolveTipoGastoFromCentroCosto(centroCostoSeleccionado) ||
          "",
      );
      const resolvedConsumidor = String(
        formData.consumidor ||
          centroCostoSeleccionado?.consumidor ||
          centroCostoSeleccionado?.raw?.consumidor ||
          centroCostoSeleccionado?.name ||
          "",
      );

      if (!resolvedIdCuenta) {
        showToast("Selecciona un centro de costo antes de guardar", "warning");
        return;
      }

      const tipoComprobanteDescripcion =
        formData.tipoComprobante === "01"
          ? "FACTURA ELECTRONICA"
          : formData.tipoComprobante === "03"
            ? "BOLETA"
            : formData.tipoComprobante === "07"
              ? "NOTA DE CRÉDITO"
              : formData.tipoComprobante === "08"
                ? "NOTA DE DÉBITO"
                : String(formData.tipoComprobante || "");

      const monedaDescripcion =
        formData.moneda === "01"
          ? "PEN"
          : formData.moneda === "03"
            ? "USD"
            : String(formData.moneda || "");

      const igvNumber = Number(formData.igv);
      const totalNumber = Number(formData.total);
      const nowIso = getLocalIsoDateTime();

      const payloadCabecera = buildPayloadCabeceraGeneral({
        formData,
        userId,
        dniToSend,
        empresa,
        politicaSeleccionada,
        categoriaSeleccionada,
        resolvedIdCuenta,
        resolvedConsumidor,
        resolvedTipoGasto,
        tipoComprobanteDescripcion,
        monedaDescripcion,
        igvNumber,
        totalNumber,
        nowIso,
      });
      /* console.log("📡 Payload cabecera:", payloadCabecera);  */

      const { idRend: responseCabecera, mensaje: mensajeSP } =
        await saveRendicionGasto(payloadCabecera);

      if (!responseCabecera) {
        const msgNorm = normalizeText(mensajeSP);
        if (
          msgNorm.includes("YA EXISTE") ||
          msgNorm.includes("DUPLICAD") ||
          msgNorm.includes("ALREADY")
        ) {
          setFacturaDuplicadaDialog({ isOpen: true, message: mensajeSP });
        } else {
          showToast(mensajeSP);
        }
        return;
      }

      const payloadDetalle = buildPayloadDetalleGeneral({
        payloadCabecera,
        formData,
        empresa,
        dniToSend,
        resolvedIdCuenta,
        resolvedConsumidor,
        responseCabecera,
        nowIso,
      });

      /*            console.log("📡 Payload detalle:", JSON.stringify(payloadDetalle, null, 2));
       */
      await saveDetalleGasto(payloadDetalle);

      if (formData.evidencia) {
        const evidenciaResult = await saveEvidenciaGasto({
          idRend: responseCabecera,
          file: formData.evidencia,
          gastoData: {
            ruc: String(formData.rucEmisor || ""),
            serie: String(formData.serie || ""),
            numero: String(formData.numero || ""),
          },
        });

        const evidenciaPath = String(evidenciaResult?.path || "").trim();

        if (evidenciaPath) {
          const payloadDetalleEvidencia = {
            ...payloadDetalle,
            idRend: String(responseCabecera),
            idrend: String(responseCabecera),
            path: evidenciaPath,
            ruta: evidenciaPath,
            rutaArchivo: evidenciaPath,
            pathArchivo: evidenciaPath,
            evidenciaPath,
            nombreArchivo: String(
              evidenciaResult?.fileName || formData.evidencia?.name || "",
            ),
            nomArchivo: String(
              evidenciaResult?.fileName || formData.evidencia?.name || "",
            ),
            ig: Number.isFinite(igvNumber) ? igvNumber : 0,
            fecEdit: nowIso,
            useEdit: Number(userId) || 0,
          };

          try {
            await saveDetalleGasto(payloadDetalleEvidencia);
          } catch (persistRutaError) {
            console.warn(
              "⚠️ No se pudo persistir ruta de evidencia en updaterendiciongasto:",
              persistRutaError?.message,
            );
          }
        }
      }

      /*   console.log("✅ Guardado ID:", responseCabecera); */

      const msgNorm = normalizeText(mensajeSP);
      const excedeLimite =
        msgNorm.includes("44") ||
        msgNorm.includes("LIMITE") ||
        msgNorm.includes("SUPERA") ||
        msgNorm.includes("EXCEDE");
      if (excedeLimite) {
        setMovilidadMontoDialog({ isOpen: true, message: mensajeSP });
      } else {
        showToast(mensajeSP);
      }

      if (evidenciaPreviewUrl) {
        URL.revokeObjectURL(evidenciaPreviewUrl);
      }

      const politicaToKeep = String(
        selectedPoliticaProp?.id ?? formData.politica ?? "",
      );
      setFormData({
        ...INITIAL_FORM_DATA,
        politica: politicaToKeep,
      });
      // El reset limpia rucCliente; se vuelve a tomar de la empresa en sesión.
      syncRucClienteDesdeSesion();
      setEvidenciaPreviewUrl("");
      setIsPreviewOpen(false);
      setIsCropMode(false);
      setCrop(undefined);
      setCompletedCrop(null);
      setSelectedPreset("doc");
      setCropShape("rect");
      setIsQrOpen(false);
      setIsOcrOpen(false);
      imageCropRef.current = null;
      setEvidenciaInputResetKey((prev) => prev + 1);
    } catch (error) {
      console.error("\u274c Error:", error);
      showToast("Error al guardar", "error");
    }
  };

  // El RUC Cliente sale de la empresa activa en sesión (no lo escribe el usuario).
  const syncRucClienteDesdeSesion = useCallback(() => {
    const rawEmpresa =
      localStorage.getItem("company") || localStorage.getItem("empresa");
    const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
    const rucClienteSesion = normalizeRuc(
      empresa?.ruc ??
        empresa?.RUC ??
        empresa?.numRuc ??
        empresa?.rucCliente ??
        empresa?.ruccliente,
    );

    if (!rucClienteSesion) return;

    setFormData((prev) =>
      prev.rucCliente === rucClienteSesion
        ? prev
        : { ...prev, rucCliente: rucClienteSesion },
    );
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const rawUser = localStorage.getItem("user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        const dniSesion = getUserDni(user);

        if (dniSesion) {
          setFormData((prev) => ({
            ...prev,
            dni: prev.dni || dniSesion,
          }));
        }

        syncRucClienteDesdeSesion();

        const politicasData = await getDropdownOptionsPolitica();

        setPoliticas(politicasData);

        await loadCategorias("todos");
        await loadCentrosCosto();
        await loadTiposGasto();
        await loadTiposComprobante();
      } catch (error) {
        console.error("Error cargando dropdowns:", error);
      }
    };

    cargarDatos();
  }, [
    loadCategorias,
    loadCentrosCosto,
    loadTiposComprobante,
    syncRucClienteDesdeSesion,
  ]);

  // Si el usuario cambia de empresa mientras el formulario sigue abierto, resincroniza el RUC Cliente.
  useEffect(() => {
    window.addEventListener("company:changed", syncRucClienteDesdeSesion);
    return () =>
      window.removeEventListener("company:changed", syncRucClienteDesdeSesion);
  }, [syncRucClienteDesdeSesion]);

  useEffect(() => {
    return () => {
      if (evidenciaPreviewUrl) {
        URL.revokeObjectURL(evidenciaPreviewUrl);
      }
    };
  }, [evidenciaPreviewUrl]);

  const fieldClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
  const labelClass = "text-sm font-semibold text-slate-700";
  const hasEvidencia = Boolean(formData.evidencia);
  const canCropImage =
    hasEvidencia && String(formData.evidencia?.type || "").startsWith("image/");

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-6xl space-y-2  p-4 pb-16  sm:p-6 sm:pb-6 lg:p-2 lg:pb-2"
    >
      <UploadWarningMessage />

      {/* Evidencia y Métodos de Captura */}
      <div className="space-y-3 sm:space-y-6">
        {/* Título de sección */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-0.5 sm:mb-1">
            Captura de documentos
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Elige cómo deseas capturar o cargar la factura
          </p>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-4">
          {/* Evidencia Uploader - Columna 1 */}
          <div className="lg:col-span-1">
            <div className="h-full rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50 transition-all p-3 sm:p-6 flex flex-col">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 bg-slate-200 rounded-lg">
                    <svg
                      className="w-6 h-6 text-slate-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Subir archivo
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Imagen o PDF</p>
                  </div>
                </div>
              </div>

              <EvidenciaUploader
                labelClass={labelClass}
                formData={formData}
                hasEvidencia={hasEvidencia}
                canCropImage={canCropImage}
                inputResetKey={evidenciaInputResetKey}
                onFileChange={handleChange}
                onOpenPreview={() => {
                  setIsPreviewOpen(true);
                  setIsCropMode(false);
                }}
                onStartCrop={() => {
                  setIsPreviewOpen(true);
                  setIsCropMode(true);
                }}
              />
            </div>
          </div>

          {/* Scanners - 3 Columnas */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* QR Scanner */}
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="group relative h-[72px] sm:h-[76px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative h-full flex items-center gap-2">
                <div className="p-1 rounded-md flex-shrink-0">
                  <RiveAnimation
                    src="/animations/barcode-scanner.riv"
                    className="h-6 w-6 sm:h-7 sm:w-7 scale-150"
                  />
                </div>

                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[11px] sm:text-xs leading-tight">
                    Código QR
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight">
                    Escanea QR
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 text-white px-2 py-1 text-[9px] sm:text-[10px] font-semibold">
                    <QrCode className="h-3 w-3" />
                    <span className="hidden sm:inline">Abrir</span>
                  </span>
                </div>
              </div>
            </button>

            {/* OCR Scanner */}
            <button
              type="button"
              onClick={() => setIsOcrOpen(true)}
              className="group relative h-[72px] sm:h-[76px] rounded-lg border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-50 px-2 py-1.5 shadow-sm hover:shadow-md hover:border-cyan-400 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative h-full flex items-center gap-2">
                <div className="p-1 bg-gradient-to-br from-cyan-200 to-blue-100 rounded-md flex-shrink-0">
                  <RiveAnimation
                    src="/animations/robot-bouncing.riv"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                  />
                </div>

                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-slate-900 text-[11px] sm:text-xs leading-tight">
                      IA
                    </p>

                    <span className="text-[8px] font-semibold text-cyan-700 bg-cyan-100 px-1 py-0.5 rounded-full">
                      Auto
                    </span>
                  </div>

                  <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight">
                    Lectura automática
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-2 py-1 text-[9px] sm:text-[10px] font-semibold">
                    <Camera className="h-3 w-3" />
                    <span className="hidden sm:inline">Subir</span>
                  </span>
                </div>
              </div>
            </button>

            {/* Cámara */}
            <button
              type="button"
              onClick={handleOpenCamera}
              className="group relative h-[72px] sm:h-[76px] rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 px-2 py-1.5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative h-full flex items-center gap-2">
                <div className="p-1 bg-gradient-to-br from-blue-200 to-indigo-100 rounded-md flex-shrink-0">
                  <RiveAnimation
                    src="/animations/robot-bouncing.riv"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                  />
                </div>

                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-slate-900 text-[11px] sm:text-xs leading-tight">
                      Cámara
                    </p>

                    <span className="text-[8px] font-semibold text-blue-700 bg-blue-100 px-1 py-0.5 rounded-full">
                      Live
                    </span>
                  </div>

                  <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight">
                    Captura directa
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-1 text-[9px] sm:text-[10px] font-semibold">
                    <Camera className="h-3 w-3" />
                    <span className="hidden sm:inline">Abrir</span>
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Datos generales */}
      {/*  <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-2"> */}
      <section className=" p-3  sm:p-2">
        <h3 className="mb-2 text-base font-bold text-slate-800">
          Datos generales
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Política</label>
            <select
              name="politica"
              className={`${fieldClass} ${selectedPoliticaProp ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
              value={formData.politica}
              onChange={handlePoliticaChange}
              disabled={Boolean(selectedPoliticaProp)}
              title={
                selectedPoliticaProp
                  ? "La política ya fue seleccionada desde el formulario principal"
                  : undefined
              }
            >
              <option value="">Seleccionar política</option>
              {politicas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Categoría</label>
            <select
              name="categoria"
              className={fieldClass}
              value={formData.categoria}
              onChange={handleChange}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Centro de costo</label>
            {isPlanillaMovilidad ? (
              <input
                type="text"
                className={`${fieldClass} bg-slate-100 text-slate-500`}
                value={
                  centrosCosto.find(
                    (cc) => String(cc.id) === String(formData.centroCosto),
                  )?.name || "Centro automático"
                }
                readOnly
                disabled
              />
            ) : (
              <select
                name="centroCosto"
                className={fieldClass}
                value={formData.centroCosto}
                onChange={handleCentroCostoChange}
              >
                <option value="">Seleccionar centro de costo</option>
                {centrosCosto.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Tipo de gasto</label>
            <input
              name="tipoGasto"
              className={`${fieldClass} bg-slate-100 text-slate-500`}
              value={formData.tipoGasto || ""}
              placeholder="Automático según centro de costo"
              disabled
              readOnly
            />
          </div>
        </div>
      </section>

      {/* Datos del comprobante */}
      <section className=" p-3  sm:p-3">
        {/* <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3"> */}
        <h3 className="mb-2 text-base font-bold text-slate-800">
          Datos del comprobante
        </h3>
        {isPlanillaMovilidad ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>RUC Cliente</label>
              <input
                type="text"
                name="rucCliente"
                placeholder="Ej. 20123456789"
                className={`${fieldClass} cursor-not-allowed bg-slate-100 text-slate-500`}
                value={formData.rucCliente}
                readOnly
                disabled
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Fecha de emisión</label>
              <input
                type="date"
                name="fecha"
                className={fieldClass}
                value={formData.fecha}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Total</label>
              <input
                type="text"
                name="total"
                placeholder="000000.00"
                className={fieldClass}
                value={formData.total}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Moneda</label>
              <select
                name="moneda"
                className={fieldClass}
                value={formData.moneda}
                onChange={handleChange}
              >
                <option value="">Seleccionar</option>
                <option value="01">PEN</option>
                <option value="03">USD</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="grid grid-cols-1 gap-2 lg:col-span-3 lg:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>RUC Emisor:</label>
                <input
                  type="number"
                  name="rucEmisor"
                  placeholder="Ej. 20123456789"
                  className={fieldClass}
                  value={formData.rucEmisor}
                  onChange={handleChange}
                  onBlur={handleRucEmisorBlur}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Razón Social:</label>
                <input
                  type="text"
                  name="razonSocial"
                  placeholder="Ej. Empresa S.A."
                  className={fieldClass}
                  value={formData.razonSocial}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>RUC Cliente:</label>
                <input
                  type="text"
                  name="rucCliente"
                  placeholder="Ej. 20123456789"
                  className={`${fieldClass} cursor-not-allowed bg-slate-400 text-white border-slate-400 disabled:bg-slate-400 disabled:text-white disabled:border-slate-400`}
                  value={formData.rucCliente}
                  readOnly
                  disabled
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Tipo de comprobante:</label>
              <select
                name="tipoComprobante"
                className={fieldClass}
                value={formData.tipoComprobante}
                onChange={handleChange}
              >
                <option value="">Seleccionar</option>
                {tiposComprobante.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 lg:col-span-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  className={fieldClass}
                  value={formData.fecha}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Moneda:</label>
                <select
                  name="moneda"
                  className={fieldClass}
                  value={formData.moneda}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar</option>
                  <option value="01">PEN</option>
                  <option value="03">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:col-span-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Serie:</label>
                <input
                  type="text"
                  name="serie"
                  placeholder="F001"
                  className={fieldClass}
                  value={formData.serie}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Número:</label>
                <input
                  type="number"
                  name="numero"
                  placeholder="0001"
                  className={fieldClass}
                  value={formData.numero}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>IGV</label>
                <input
                  type="number"
                  name="igv"
                  placeholder="0.00"
                  className={fieldClass}
                  value={formData.igv}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Total:</label>
                <input
                  type="text"
                  name="total"
                  placeholder="00.00"
                  className={fieldClass}
                  value={formData.total}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Glosa */}
      <section className=" p-4  sm:p-5">
        {/* <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"> */}
        <label className={`${labelClass} mb-1 block`}>Glosa:</label>
        <textarea
          name="glosa"
          type="text"
          placeholder="Agrega una descripcion breve del gasto o nota"
          className={`${fieldClass} min-h-28 resize-none`}
          value={formData.glosa}
          onChange={handleChange}
        />
      </section>

      {/* Botones */}
      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 cursor-pointer sm:w-auto"
        >
          <Save size={17} aria-hidden="true" />
          Guardar
        </button>
      </div>

      <EvidenciaCropModal
        isOpen={isPreviewOpen}
        hasEvidencia={hasEvidencia}
        canCropImage={canCropImage}
        isCropMode={isCropMode}
        onClose={() => {
          setIsPreviewOpen(false);
          setIsCropMode(false);
        }}
        onStartCrop={() => setIsCropMode(true)}
        onCancelCrop={() => setIsCropMode(false)}
        onApplyCrop={handleApplyCrop}
        previewUrl={evidenciaPreviewUrl}
        fileName={formData.evidencia?.name}
        crop={crop}
        onChangeCrop={(nextCrop) => setCrop(nextCrop)}
        onCompleteCrop={(pixelCrop) => setCompletedCrop(pixelCrop)}
        selectedAspect={selectedAspect}
        cropShape={cropShape}
        onImageLoaded={handleImageLoaded}
        selectedPreset={selectedPreset}
        onSelectPreset={handleChangePreset}
        cropPresets={cropPresets}
        onSetCropShape={setCropShape}
        onReset={handleResetCropState}
      />

      <QrScannerModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onDetected={handleQrDetected}
      />

      <OcrScannerModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onDetected={handleOcrDetected}
      />

      <RucValidationDialog
        isOpen={rucValidationDialog.isOpen}
        rucClienteOcr={rucValidationDialog.rucClienteOcr}
        rucEmpresa={rucValidationDialog.rucEmpresa}
        razonSocialOcr={rucValidationDialog.razonSocialOcr}
        razonSocialEmpresa={rucValidationDialog.razonSocialEmpresa}
        onAccept={() => {
          if (rucValidationDialog.onConfirm) {
            rucValidationDialog.onConfirm();
          }
          setRucValidationDialog({ ...rucValidationDialog, isOpen: false });
        }}
        onCancel={() => {
          showToast("❌ Operación cancelada. Los RUC no coinciden.", "error");
          console.warn("✋ Usuario rechazó validación de RUC");
          setRucValidationDialog({ ...rucValidationDialog, isOpen: false });
        }}
      />

      <Toast
        message={toastConfig.message}
        type={toastConfig.type}
        isVisible={toastConfig.isVisible}
        onClose={closeToast}
        duration={3000}
      />

      {/* Modal: Límite de monto movilidad */}
      {movilidadMontoDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            {/* Título */}
            <div className="flex items-center gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m2 0a8 8 0 11-16 0 8 8 0 0116 0zm-8-4h.01M12 16h.01"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold tracking-wide text-red-600">
                MONTO MOVILIDAD
              </h2>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-2 rounded-lg border border-red-400 bg-red-50/60 p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"
                  />
                </svg>
                <p className="text-sm font-semibold text-slate-700 uppercase">
                  {movilidadMontoDialog.message}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end rounded-b-2xl border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  setMovilidadMontoDialog({ isOpen: false, message: "" })
                }
                className="rounded-xl bg-red-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Factura duplicada */}
      {facturaDuplicadaDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            {/* Título */}
            <div className="flex items-center gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m2 0a8 8 0 11-16 0 8 8 0 0116 0zm-8-4h.01M12 16h.01"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold tracking-wide text-red-600">
                MENSAJE:
              </h2>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/60 p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"
                  />
                </svg>
                <p className="text-sm text-slate-700">
                  {facturaDuplicadaDialog.message}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end rounded-b-2xl border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  setFacturaDuplicadaDialog({ isOpen: false, message: "" })
                }
                className="rounded-xl bg-red-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cámara */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[98vw] sm:w-full sm:max-w-2xl h-[100dvh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Capturar Foto
              </h2>
              <button
                onClick={stopCamera}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            {/* Video */}
            <div className="relative bg-black flex-1 w-full overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <button
                onClick={stopCamera}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCaptureFoto}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
              >
                Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
