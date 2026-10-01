import { useState, useRef } from "react";
import { X, Upload, Loader, AlertCircle, Trash2, Camera } from "lucide-react";
import { extraerDatosComprobante } from "../../services/ocrExtraction";
import OcrResultsTable from "./OcrResultsTable";
import RiveAnimation from "../RiveAnimation";
import ImageZoomLightbox from "../ImagZoom/ImageZoomLightbox";
import * as pdfjsLib from "pdfjs-dist";
import { isPdfFile } from "../../services/isPdfFile";
import Update from "@/Icons/update";
import { IconClose } from "@/Icons/close";
import InvalidFileTypeMessage from "../message/InvalidFileTypeMessage";

const BLOCKED_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".doc", ".docx"];
const BLOCKED_MIME_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function getBlockedFileType(file) {
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (
    BLOCKED_MIME_TYPES.slice(0, 3).includes(file.type) ||
    [".xlsx", ".xls", ".xlsm"].includes(ext)
  )
    return "excel";
  if (
    BLOCKED_MIME_TYPES.slice(3).includes(file.type) ||
    [".doc", ".docx"].includes(ext)
  )
    return "word";
  return null;
}

export default function OcrScannerModal({
  isOpen,
  onClose,
  onDetected,
  datosGenerales,
}) {
  const [archivos, setArchivos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [mostrando, setMostrando] = useState("upload"); // "upload" o "results"
  const [zoomImage, setZoomImage] = useState(null); // Para el zoom de previews
  const [invalidFiles, setInvalidFiles] = useState([]); // Archivos bloqueados
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Separar archivos bloqueados de los permitidos
    const blocked = [];
    const allowed = [];
    for (const file of files) {
      const blockedType = getBlockedFileType(file);
      if (blockedType) {
        blocked.push({ name: file.name, type: blockedType });
      } else {
        allowed.push(file);
      }
    }

    if (blocked.length > 0) {
      setInvalidFiles(blocked);
      if (allowed.length === 0) return;
    }

    setError(null);
    setCargando(true);

    const newPreviews = [];

    try {
      for (const file of allowed) {
        if (isPdfFile(file)) {
          // Convertir PDF a imagen
          const pdfWorkerUrl = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).href;
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);

          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const context = canvas.getContext("2d");
          await page.render({ canvasContext: context, viewport }).promise;

          newPreviews.push({
            file,
            preview: canvas.toDataURL("image/png"),
          });
        } else if (file.type.startsWith("image/")) {
          // Mostrar imagen directamente
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = (event) => {
              newPreviews.push({
                file,
                preview: event.target.result,
              });
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      }

      // Solo se agregan (a los existentes) si todo el lote se procesó sin
      // error; así un archivo con problemas no borra los ya cargados.
      setArchivos((archivosAnteriores) => [...archivosAnteriores, ...allowed]);
      setPreviews((previewsAnteriores) => [
        ...previewsAnteriores,
        ...newPreviews,
      ]);
      setCargando(false);
    } catch (err) {
      setError(`Error al procesar archivos: ${err.message}`);
      setCargando(false);
    }
  };

  const procesarImagen = async () => {
    if (archivos.length === 0) {
      setError("Por favor selecciona al menos una imagen de factura");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const todosLosDatos = [];

      // Procesar cada archivo
      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const datos = await extraerDatosComprobante(archivo);

        // Agregar la vista previa del archivo
        todosLosDatos.push({
          ...datos,
          preview: previews[i]?.preview || null,
        });
      }

      // ⏱️ TIEMPO DINÁMICO según cantidad de archivos
      // Base: 2000ms + 500ms por cada archivo
      const tiempoDelay = 2000 + archivos.length * 500;

      // Mostrar loading durante el delay, LUEGO mostrar resultados
      setTimeout(() => {
        setCargando(false);

        // Ahora mostrar resultados DESPUÉS del delay
        if (todosLosDatos.length >= 2) {
          setResultados(todosLosDatos);
          setMostrando("results");
        } else {
          // Si es solo 1, devolver directamente
          onDetected(todosLosDatos[0]);
          limpiar();
          onClose();
        }
      }, tiempoDelay);
    } catch (err) {
      setError(err.message || "Error al procesar las imágenes");
      setCargando(false);
    }
  };

  const limpiar = () => {
    setArchivos([]);
    setPreviews([]);
    setResultados([]);
    setMostrando("upload");
    setError(null);
    setInvalidFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    limpiar();
    onClose();
  };

  const eliminarArchivo = (idxAEliminar) => {
    const nuevosArchivos = archivos.filter((_, idx) => idx !== idxAEliminar);
    const nuevosPreviews = previews.filter((_, idx) => idx !== idxAEliminar);
    setArchivos(nuevosArchivos);
    setPreviews(nuevosPreviews);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          mostrando === "results"
            ? "max-w-6xl max-h-[92vh]"
            : "max-w-2xl max-h-[92vh]"
        }`}
      >
        {/* ==================== HEADER ==================== */}
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {/* Robot */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ">
                <RiveAnimation
                  src="/animations/robot-bouncing.riv"
                  className="h-12 w-12"
                />
              </div>

              {/* Título */}
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                    OpenScan IA
                  </h2>

                  {/*   <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 sm:inline-flex">
                    IA
                  </span> */}
                </div>

                {/*   <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                  Extrae automáticamente los datos de tus comprobantes
                </p> */}
              </div>
            </div>

            {/* Cerrar */}
            <button
              onClick={handleClose}
              disabled={cargando}
              className="
              ml-3 flex h-9 w-9 shrink-0 items-center justify-center
              rounded-lg border border-slate-200 bg-white
              text-slate-400 shadow-sm
              transition-all duration-200
              hover:border-red-200 hover:bg-red-50 hover:text-red-600
              active:scale-95
              disabled:cursor-not-allowed disabled:opacity-50
              cursor-pointer
            "
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ==================== BODY ==================== */}
        <div
          className={`min-h-0 flex-1 ${
            mostrando === "results" ? "overflow-y-auto" : "overflow-y-auto"
          }`}
        >
          {mostrando === "results" ? (
            /* ==================== RESULTS ==================== */
            <div className="p-4 sm:p-6">
              <OcrResultsTable
                resultados={resultados}
                datosGenerales={datosGenerales}
                onConfirm={(updatedResultados) => {
                  onDetected(
                    updatedResultados.length === 1
                      ? updatedResultados[0]
                      : updatedResultados,
                  );
                  limpiar();
                  onClose();
                }}
                onCancel={() => {
                  setMostrando("upload");
                  setResultados([]);
                }}
              />
            </div>
          ) : (
            /* ==================== UPLOAD ==================== */
            <div className="space-y-5 p-5 sm:p-6">
              {/* Título de sección */}
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Carga tus comprobantes
                </h3>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Selecciona una o varias imágenes o archivos PDF para extraer
                  sus datos automáticamente.
                </p>
              </div>

              {/* ==================== UPLOAD AREA ==================== */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={cargando}
                  multiple
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={cargando}
                  className="
                  group w-full rounded-2xl border-2 border-dashed
                  border-slate-300 bg-slate-50/80
                  px-5 py-7 text-center
                  transition-all duration-200
                  hover:border-blue-400 hover:bg-blue-50/50
                  hover:shadow-sm
                  active:scale-[0.995]
                  disabled:cursor-not-allowed disabled:opacity-60
                  cursor-pointer
                "
                >
                  {/* Icono */}
                  <div
                    className="
                    mx-auto mb-3 flex h-12 w-12 items-center justify-center
                    rounded-xl bg-blue-100 text-blue-600
                    transition-all duration-200
                    group-hover:scale-105 group-hover:bg-blue-200
                  "
                  >
                    <Upload className="h-5 w-5" />
                  </div>

                  {/* Texto principal */}
                  <p className="text-sm font-bold text-slate-900 sm:text-base">
                    {archivos.length > 0
                      ? `${archivos.length} archivo${
                          archivos.length > 1 ? "s" : ""
                        } seleccionado${archivos.length > 1 ? "s" : ""}`
                      : "Selecciona tus comprobantes"}
                  </p>

                  {/* Descripción */}
                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 sm:text-sm">
                    {archivos.length > 0
                      ? "Puedes agregar más archivos si lo necesitas"
                      : "Haz clic aquí para buscar archivos desde tu dispositivo"}
                  </p>

                  {/* Formatos */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                      .JPG
                    </span>

                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                      .PNG
                    </span>

                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                      .PDF
                    </span>
                  </div>
                </button>
              </div>

              {/* ==================== PREVIEWS ==================== */}
              {previews.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Preview Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-slate-700 sm:text-sm">
                        Archivos seleccionados
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {previews.length}{" "}
                        {previews.length === 1 ? "archivo" : "archivos"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={cargando}
                      className="
                      inline-flex items-center gap-1.5
                      rounded-lg border border-blue-200
                      bg-white px-2.5 py-1.5
                      text-xs font-semibold text-blue-600
                      shadow-sm
                      transition-all duration-200
                      hover:bg-blue-50 hover:border-blue-300
                      active:scale-95
                      disabled:cursor-not-allowed disabled:opacity-50
                      cursor-pointer
                    "
                      title="Agregar más archivos"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Agregar más</span>
                    </button>
                  </div>

                  {/* Grid */}
                  <div className="max-h-72 overflow-y-auto p-3 sm:p-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {previews.map((item, idx) => (
                        <div
                          key={idx}
                          className="
                          group relative overflow-hidden
                          rounded-xl border border-slate-200
                          bg-white
                          shadow-sm
                          transition-all duration-200
                          hover:border-blue-300 hover:shadow-md
                        "
                        >
                          {/* Número */}
                          <div className="absolute left-2 top-2 z-10">
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900/75 px-1.5 text-[10px] font-bold text-white backdrop-blur-sm">
                              {idx + 1}
                            </span>
                          </div>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarArchivo(idx);
                            }}
                            disabled={cargando}
                            className="
                            absolute right-2 top-2 z-20
                            flex h-7 w-7 items-center justify-center
                            rounded-full
                            bg-red-500 text-white
                            shadow-md
                            opacity-100
                            transition-all duration-200
                            hover:bg-red-600
                            active:scale-90
                            sm:opacity-0 sm:group-hover:opacity-100
                            disabled:cursor-not-allowed disabled:opacity-50
                            cursor-pointer
                          "
                            title="Eliminar archivo"
                            aria-label={`Eliminar ${item.file.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Preview clickeable */}
                          <button
                            type="button"
                            onClick={() => setZoomImage(item.preview)}
                            className="block w-full text-left cursor-pointer"
                            title="Ver imagen"
                          >
                            <div className="relative h-32 overflow-hidden bg-slate-100 sm:h-36">
                              <img
                                src={item.preview}
                                alt={`Vista previa ${idx + 1}`}
                                className="
                                h-full w-full object-cover
                                transition-transform duration-300
                                group-hover:scale-105
                              "
                              />

                              {/* Overlay */}
                              <div
                                className="
                                absolute inset-0
                                flex items-center justify-center
                                bg-slate-950/0
                                transition-all duration-200
                                group-hover:bg-slate-950/30
                              "
                              >
                                <div
                                  className="
                                  flex h-9 w-9 items-center justify-center
                                  rounded-full bg-white/90
                                  text-slate-700 shadow-lg
                                  opacity-0 scale-90
                                  transition-all duration-200
                                  group-hover:scale-100
                                  group-hover:opacity-100
                                "
                                >
                                  <span className="text-base">🔍</span>
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Nombre */}
                          <div className="border-t border-slate-100 px-2.5 py-2">
                            <p
                              className="truncate text-[11px] font-medium text-slate-600"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== INVALID FILE TYPE ==================== */}
              {invalidFiles.length > 0 && (
                <InvalidFileTypeMessage
                  files={invalidFiles}
                  onDismiss={() => setInvalidFiles([])}
                />
              )}

              {/* ==================== ERROR ==================== */}
              {error && (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="text-sm font-bold text-red-800">
                      No se pudieron procesar los archivos
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* ==================== INFO ==================== */}
              {!error && archivos.length === 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                  <div>
                    <p className="text-xs font-semibold text-blue-900">
                      Procesamiento inteligente
                    </p>

                    <p className="mt-0.5 text-xs leading-5 text-blue-700">
                      OpenScan IA analizará tus comprobantes y detectará
                      automáticamente la información disponible.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== FOOTER ==================== */}
        {mostrando !== "results" && (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-row gap-2.5">
              {/* Cancelar */}
              <button
                onClick={handleClose}
                disabled={cargando}
                className="
    group
    flex flex-1
    items-center justify-center gap-1.5
    rounded-lg
    border border-slate-300
    bg-white
    px-3 py-2.5
    text-sm
    font-semibold text-slate-700
    shadow-sm
    transition-all duration-200
    hover:border-red-300
    hover:bg-red-50
    hover:text-red-600
    active:scale-[0.98]
    disabled:cursor-not-allowed
    disabled:opacity-50
    cursor-pointer
    sm:px-4
  "
              >
                <span>Cancelar</span>

                <IconClose
                  className="
    h-4 w-4 shrink-0
    transition-transform duration-300
    group-hover:rotate-90
  "
                />
              </button>

              {/* Procesar */}
              <button
                onClick={procesarImagen}
                disabled={archivos.length === 0 || cargando}
                className="
    group
    flex flex-1
    items-center justify-center gap-1.5
    rounded-lg
    bg-blue-600
    px-3 py-2.5
    text-sm
    font-semibold text-white
    shadow-sm
    transition-all duration-200
    hover:bg-blue-700
    hover:shadow-md
    active:scale-[0.98]
    disabled:cursor-not-allowed
    disabled:bg-slate-300
    disabled:shadow-none
    cursor-pointer
  "
              >
                {cargando ? (
                  <>
                    <Loader className="h-4 w-4 shrink-0 animate-spin" />
                    <span className="truncate">Procesando...</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">Extraer datos</span>

                    <Update
                      className="
          h-4 w-4 shrink-0
          text-blue-200
          group-hover:animate-spin
        "
                    />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== ZOOM ==================== */}
      <ImageZoomLightbox src={zoomImage} onClose={() => setZoomImage(null)} />

      {/* ==================== LOADING ==================== */}
      {cargando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
            {/* Contenido */}
            <div className="flex flex-col items-center px-6 pb-7 pt-5">
              {/* Robot */}
              <div className="mb-3 flex h-40 w-40 items-center justify-center">
                <RiveAnimation
                  src="/animations/robot-bouncing.riv"
                  className="h-36 w-36"
                />
              </div>

              {/* Texto */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                  OpenScan IA
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  Analizando tus comprobantes
                </h3>

                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-5 text-slate-500">
                  La IA está identificando la información de tus{" "}
                  {archivos.length === 1 ? "archivo" : "archivos"}.
                </p>
              </div>

              {/* Progreso */}
              <div className="mt-6 w-full space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>
                    {archivos.length}{" "}
                    {archivos.length === 1 ? "archivo" : "archivos"}
                  </span>

                  <span className="text-blue-600">Procesando...</span>
                </div>

                <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="
                    absolute inset-y-0 left-0
                    w-1/3 rounded-full
                    bg-gradient-to-r from-blue-400 to-blue-600
                  "
                    style={{
                      animation: "slideProgress 2s ease-in-out infinite",
                    }}
                  />
                </div>

                <style>{`
                @keyframes slideProgress {
                  0%,
                  100% {
                    left: 0;
                    width: 33%;
                  }

                  50% {
                    left: 67%;
                    width: 33%;
                  }
                }
              `}</style>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
