import { useCallback, useEffect, useRef, useState } from "react";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import { Save, ChevronDown } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf.mjs";
import ScannerCardsGrid, { EvidenciaUploader } from "./ScannerCardsGrid";
import EvidenciaCropModal from "./EvidenciaCropModal";
import QrScannerModal from "../../OCRScanner/QrScannerModal";
import OcrScannerModal from "../../OCRScanner/OcrScannerModal";
import Toast from "../../shared/Toast";
import SearchableSelect from "../../shared/SearchableSelect.jsx";
import useMovilidadForm from "../../../services/hooks/useMovilidadForm";

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
  let pdfDocument;
  try {
    pdfDocument = await getDocument({ data: pdfData }).promise;
  } catch {
    // Fallback para evitar fallos intermitentes del worker en algunos navegadores/entornos.
    pdfDocument = await getDocument({ data: pdfData, disableWorker: true })
      .promise;
  }
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

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
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

const getLocalDateInputValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function GastoMovilidad({
  selectedPolitica: selectedPoliticaProp = null,
}) {
  const {
    formData,
    setFormData,
    politicas,
    categorias,
    centrosCosto,
    tiposMovilidad,
    handlePoliticaChange,
    handleCentroCostoChange,
    handleRucEmisorBlur,
    handleQrDetected,
    handleSubmit,
    errorMessage,
    setErrorMessage,
  } = useMovilidadForm({ selectedPolitica: selectedPoliticaProp });

  const [evidenciaPreviewUrl, setEvidenciaPreviewUrl] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("doc");
  const [cropShape, setCropShape] = useState("rect");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [highlightDatos, setHighlightDatos] = useState(false);
  const [openSections, setOpenSections] = useState({ datos: true, captura: true, comprobante: true, movilidad: true, glosa: true });
  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [evidenciaInputResetKey, setEvidenciaInputResetKey] = useState(0);
  const [movilidadMontoDialog, setMovilidadMontoDialog] = useState({
    isOpen: false,
    message: "",
  });
  const imageCropRef = useRef(null);

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    const result = await handleSubmit(e);
    if (!result?.saved) return;

    const msgNorm = String(result.mensaje ?? "")
      .toUpperCase()
      .trim();
    const excedeLimite =
      msgNorm.includes("44") ||
      msgNorm.includes("LIMITE") ||
      msgNorm.includes("SUPERA") ||
      msgNorm.includes("EXCEDE");

    if (excedeLimite) {
      setMovilidadMontoDialog({ isOpen: true, message: result.mensaje });
    } else {
      alert("Guardado correctamente ✅");
    }

    window.dispatchEvent(new CustomEvent("gasto:updated"));

    if (evidenciaPreviewUrl) {
      URL.revokeObjectURL(evidenciaPreviewUrl);
    }

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
  };

  // IMPORTANTE: Siempre leer FRESCO del localStorage para capturar cambios de empresa
  const getRucEmpresaSesion = useCallback(() => {
    try {
      const normalizeRuc = (value) =>
        String(value ?? "")
          .replace(/\D/g, "")
          .trim();
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

  const handleOcrDetected = (datosOcr) => {
    const rucEmisorLimpio = String(datosOcr.rucEmisor || "").replace(/\D/g, "");
    const rucClienteOcr = String(datosOcr.rucCliente || "").replace(/\D/g, "");
    const razonSocialOcr = String(datosOcr.razonSocial || "").trim();

    // Validar que el RUC cliente de la factura coincida con la empresa logueada
    const rucEmpresa = getRucEmpresaSesion();

    // DEBUG: Mostrar valores con máximo detalle
    console.log("═══════════════════════════════════════");
    console.log("🔍 OCR VALIDACIÓN RUC (MOVILIDAD) - DATOS COMPLETOS:");
    console.log("═══════════════════════════════════════");
    console.log("📋 Del OCR extraído:", datosOcr);
    console.log(`  • rucEmisor (limpio): "${rucEmisorLimpio}"`);
    console.log(`  • rucCliente (limpio): "${rucClienteOcr}"`);
    console.log(`  • razonSocial: "${razonSocialOcr}"`);
    console.log("───────────────────────────────────────");
    console.log("🏢 De la empresa en sesión:");
    console.log(`  • rucEmpresa: "${rucEmpresa}"`);
    console.log("───────────────────────────────────────");

    // Validación: Solo si ambos RUC existen y son diferentes
    if (rucClienteOcr && rucEmpresa) {
      console.log("✅ Ambos RUC presentes - Comparando...");
      if (rucClienteOcr !== rucEmpresa) {
        console.warn(
          `❌ RUC NO COINCIDEN: "${rucClienteOcr}" !== "${rucEmpresa}"`,
        );
        const confirmacion = window.confirm(
          `⚠️ ADVERTENCIA - RUC NO COINCIDE:\n\n` +
            `RUC cliente en factura: ${rucClienteOcr}\n` +
            `RUC empresa logueada: ${rucEmpresa}\n\n` +
            `¿Deseas continuar de todas formas?`,
        );
        if (!confirmacion) {
          setErrorMessage("❌ Operación cancelada. Los RUC no coinciden.");
          console.warn("✋ Usuario rechazó validación de RUC");
          return;
        }
      } else {
        console.log("✅ RUC validado correctamente - coinciden perfectamente");
      }
    } else {
      // Si falta el rucCliente, es un error - No se puede validar
      if (!rucClienteOcr) {
        console.error(
          "❌ ERROR CRÍTICO: No se extrajo RUC Cliente de la factura",
        );
        console.warn(
          `  • rucClienteOcr: "${rucClienteOcr || "∅ VACÍO"}" (tipo: ${typeof rucClienteOcr})`,
        );
        console.warn(
          `  • rucEmpresa: "${rucEmpresa || "∅ VACÍO"}" (tipo: ${typeof rucEmpresa})`,
        );
        console.log("═══════════════════════════════════════");

        setErrorMessage(
          "⚠️ No se pudo extraer el RUC del Cliente. Verifica que la factura sea clara y legible.",
        );
        return; // BLOQUEAR: No permitir continuar sin RUC Cliente
      }

      // Si falta rucEmpresa (no hay empresa logueada)
      if (!rucEmpresa) {
        console.warn("❌ No se encontró empresa en sesión");
        setErrorMessage("Error: No hay empresa activa en sesión.");
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

    setErrorMessage(
      "Factura escaneada. Se autocompletaron los datos detectados",
    );
  };

  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    if (files) {
      let selectedFile = files[0] || null;

      if (name === "evidencia" && isPdfFile(selectedFile)) {
        try {
          selectedFile = await convertPdfToImageFile(selectedFile);
        } catch (error) {
          console.error("No se pudo convertir el PDF a imagen", error);
          setErrorMessage("No se pudo convertir el PDF a imagen");
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

  const selectedCategoria = categorias.find(
    (categoria) => String(categoria.id) === String(formData.categoria),
  );
  const isPlanillaMovilidad = normalizeText(selectedCategoria?.name).includes(
    "PLANILLA DE MOVILIDAD",
  );

  const handleCategoriaChange = (e) => {
    const { value } = e.target;
    const categoriaSeleccionada = categorias.find(
      (categoria) => String(categoria.id) === String(value),
    );
    const planillaSeleccionada = normalizeText(
      categoriaSeleccionada?.name,
    ).includes("PLANILLA DE MOVILIDAD");

    if (planillaSeleccionada && centrosCosto.length > 0) {
      const centroAutomatico = centrosCosto[0];
      const fechaDefault =
        String(formData.fecha || "").trim() || getLocalDateInputValue();

      setFormData((prev) => ({
        ...prev,
        categoria: value,
        centroCosto: String(centroAutomatico?.id || ""),
        tipoGasto: resolveTipoGastoFromCentroCosto(centroAutomatico),
        consumidor:
          centroAutomatico?.consumidor || centroAutomatico?.name || "",
        fecha: prev.fecha || fechaDefault,
      }));

      return;
    }

    const viajesConComprobante = normalizeText(
      categoriaSeleccionada?.name,
    ).includes("VIAJES CON COMPROBANTE");

    if (viajesConComprobante) {
      setFormData((prev) => ({
        ...prev,
        categoria: value,
        tipoComprobante: "01",
        fecha: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      categoria: value,
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
    } catch {
      /* console.error("Error recortando imagen en movilidad:", error); */
      alert("No se pudo recortar la imagen");
    }
  };

  useEffect(() => {
    return () => {
      if (evidenciaPreviewUrl) {
        URL.revokeObjectURL(evidenciaPreviewUrl);
      }
    };
  }, [evidenciaPreviewUrl]);

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-600";
  const hasEvidencia = Boolean(formData.evidencia);

  const SectionHeader = ({ sectionKey, title, accent = "bg-cyan-500" }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="mb-4 flex w-full items-center justify-between gap-2.5 sm:cursor-default sm:pointer-events-none"
    >
      <div className="flex items-center gap-2.5">
        <span className={`h-5 w-1 rounded-full ${accent}`} />
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:hidden ${openSections[sectionKey] ? "rotate-180" : ""}`}
      />
    </button>
  );
  const canCropImage =
    hasEvidencia && String(formData.evidencia?.type || "").startsWith("image/");

  const requireDatosGenerales = (action) => {
    if (!formData.categoria || !formData.centroCosto) {
      setErrorMessage("Primero selecciona la categoría y el centro de costo");
      setHighlightDatos(true);
      setTimeout(() => setHighlightDatos(false), 2500);
      return;
    }
    action();
  };

  return (
    <>
      <form
        onSubmit={handleSubmitForm}
        className="mx-auto mt-4 w-full max-w-6xl space-y-3 pb-16 sm:pb-6"
      >
        {/*DATOS GENERALES */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <SectionHeader sectionKey="datos" title="Datos Generales" />
          <div className={!openSections.datos ? "hidden sm:block" : ""}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>
                Categoría <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="categoria"
                options={categorias}
                value={formData.categoria}
                onChange={handleCategoriaChange}
                placeholder="Seleccionar categoría"
                searchPlaceholder="Buscar categoría…"
                className={
                  highlightDatos && !formData.categoria
                    ? "ring-2 ring-red-400 rounded-xl"
                    : ""
                }
              />
            </div>

            <div>
              <label className={labelClass}>
                Centro de Costo <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="centroCosto"
                options={centrosCosto}
                value={formData.centroCosto}
                onChange={handleCentroCostoChange}
                placeholder="Seleccionar centro de costo"
                searchPlaceholder="Buscar centro de costo…"
                className={
                  highlightDatos && !formData.centroCosto
                    ? "ring-2 ring-red-400 rounded-xl"
                    : ""
                }
              />
            </div>

            <div>
              <label className={labelClass}>
                Tipo de Gasto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tipoGasto || ""}
                placeholder="Automático según centro de costo"
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 placeholder:text-slate-400"
              />
            </div>
          </div>
          </div>
        </section>
        {/* Captura de documentos */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <SectionHeader sectionKey="captura" title="Captura de documentos" />
          <div className={!openSections.captura ? "hidden sm:block" : ""}>
          {isPlanillaMovilidad ? (
            <EvidenciaUploader
              labelClass={labelClass}
              formData={formData}
              hasEvidencia={hasEvidencia}
              canCropImage={canCropImage}
              inputResetKey={evidenciaInputResetKey}
              onFileChange={(e) => requireDatosGenerales(() => handleChange(e))}
              onOpenPreview={() => {
                setIsPreviewOpen(true);
                setIsCropMode(false);
              }}
              onStartCrop={() => {
                setIsPreviewOpen(true);
                setIsCropMode(true);
              }}
            />
          ) : (
            <ScannerCardsGrid
              onQrClick={() => requireDatosGenerales(() => setIsQrOpen(true))}
              onOcrClick={() => requireDatosGenerales(() => setIsOcrOpen(true))}
              onCameraClick={() => requireDatosGenerales(() => {})}
              onFileChange={(e) => requireDatosGenerales(() => handleChange(e))}
              labelClass={labelClass}
              formData={formData}
              hasEvidencia={hasEvidencia}
              canCropImage={canCropImage}
              inputResetKey={evidenciaInputResetKey}
              onOpenPreview={() => {
                setIsPreviewOpen(true);
                setIsCropMode(false);
              }}
              onStartCrop={() => {
                setIsPreviewOpen(true);
                setIsCropMode(true);
              }}
            />
          )}
          </div>
        </section>

        {isPlanillaMovilidad ? (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <SectionHeader sectionKey="comprobante" title="Datos del comprobante" />
            <div className={!openSections.comprobante ? "hidden sm:block" : ""}>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>
                  RUC Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="rucCliente"
                  className={`${fieldClass} cursor-not-allowed`}
                  value={formData.rucCliente}
                  disabled
                />
              </div>
              <div>
                <label className={labelClass}>
                  Fecha de emisión <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fecha"
                  className={fieldClass}
                  value={formData.fecha}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Total <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="total"
                  className={fieldClass}
                  value={formData.total}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Moneda <span className="text-red-500">*</span>
                </label>
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
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <SectionHeader sectionKey="comprobante" title="Datos del comprobante" />
            <div className={!openSections.comprobante ? "hidden sm:block" : ""}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>
                  RUC Emisor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="rucEmisor"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="RUC del Emisor"
                  className={fieldClass}
                  value={formData.rucEmisor}
                  onChange={handleChange}
                  onBlur={handleRucEmisorBlur}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="razonSocial"
                  placeholder="Proveedor / Razón social"
                  className={fieldClass}
                  value={formData.razonSocial}
                  readOnly
                />
              </div>
              <div>
                <label className={labelClass}>
                  RUC Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="rucCliente"
                  placeholder="RUC del Cliente"
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 focus:border-slate-200 focus:ring-0 focus:outline-none"
                  value={formData.rucCliente}
                  readOnly
                />
              </div>
              <div>
                <label className={labelClass}>
                  Tipo Comprobante <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipoComprobante"
                  className={fieldClass}
                  value={formData.tipoComprobante}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar</option>
                  <option value="01">FACTURA ELECTRONICA</option>
                  <option value="03">BOLETA</option>
                  <option value="07">NOTA DE CRÉDITO</option>
                  <option value="08">NOTA DE DÉBITO</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fecha"
                  className={fieldClass}
                  value={formData.fecha}
                  onChange={handleChange}
                />
              </div>
              <div className="hidden lg:block">
                <div>
                  <label className={labelClass}>
                    Serie <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="serie"
                    placeholder="Serie"
                    className={fieldClass}
                    value={formData.serie}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:col-span-2 lg:hidden">
                <div>
                  <label className={labelClass}>
                    Serie <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="serie"
                    placeholder="Serie"
                    className={fieldClass}
                    value={formData.serie}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="numero"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Número"
                    className={fieldClass}
                    value={formData.numero}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    IGV <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="igv"
                    inputMode="decimal"
                    placeholder="IGV"
                    className={fieldClass}
                    value={formData.igv}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Total <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="total"
                    inputMode="decimal"
                    placeholder="Total"
                    className={fieldClass}
                    value={formData.total}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>
                    Moneda <span className="text-red-500">*</span>
                  </label>
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

              <div className="hidden gap-4 lg:col-span-3 lg:grid lg:grid-cols-4">
                <div>
                  <label className={labelClass}>
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="numero"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Número"
                    className={fieldClass}
                    value={formData.numero}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    IGV <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="igv"
                    inputMode="decimal"
                    placeholder="IGV"
                    className={fieldClass}
                    value={formData.igv}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Total <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="total"
                    inputMode="decimal"
                    placeholder="Total"
                    className={fieldClass}
                    value={formData.total}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Moneda <span className="text-red-500">*</span>
                  </label>
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
            </div>
            </div>
          </section>
        )}
        {isPlanillaMovilidad && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <SectionHeader sectionKey="movilidad" title="Datos de la Movilidad" accent="bg-emerald-500" />
            <div className={!openSections.movilidad ? "hidden sm:block" : ""}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>
                  Origen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="origen"
                  placeholder="Origen"
                  className={fieldClass}
                  value={formData.origen || ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Destino <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="destino"
                  placeholder="Destino"
                  className={fieldClass}
                  value={formData.destino || ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Motivo de viaje <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="motivoViaje"
                  placeholder="Motivo de viaje"
                  className={fieldClass}
                  value={formData.motivoViaje || ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Tipo de movilidad <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipoMovilidad"
                  className={fieldClass}
                  value={formData.tipoMovilidad || ""}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar tipo de movilidad</option>
                  {tiposMovilidad.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Placa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="placa"
                  placeholder="Placa"
                  className={fieldClass}
                  value={formData.placa || ""}
                  onChange={handleChange}
                />
              </div>
            </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <SectionHeader sectionKey="glosa" title={<>Glosa <span className="text-red-500">*</span></>} accent="bg-slate-400" />
          <div className={!openSections.glosa ? "hidden sm:block" : ""}>
          <textarea
            name="glosa"
            placeholder="Escribe una nota o descripción del gasto..."
            className={`${fieldClass} min-h-28 resize-none`}
            value={formData.glosa}
            onChange={handleChange}
          />
          </div>
        </section>

        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:bg-emerald-400 disabled:text-slate-200 sm:w-auto"
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
      </form>

      <Toast
        message={errorMessage}
        type="error"
        isVisible={Boolean(errorMessage)}
        onClose={() => setErrorMessage("")}
        duration={5000}
      />

      {/* Modal: Límite de monto movilidad */}
      {movilidadMontoDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
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
                <p className="text-sm font-semibold uppercase text-slate-700">
                  {movilidadMontoDialog.message}
                </p>
              </div>
            </div>
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
    </>
  );
}
