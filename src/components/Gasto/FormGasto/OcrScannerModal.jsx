import { useState, useRef } from "react";
import { X, Upload, Loader, AlertCircle, Trash2, Camera } from "lucide-react";
import { extraerDatosComprobante } from "../../../services/ocrExtraction";
import OcrResultsTable from "./OcrResultsTable";
import RiveAnimation from "../../RiveAnimation";
import ImageZoomLightbox from "../ImageZoomLightbox";
import * as pdfjsLib from "pdfjs-dist";

export default function OcrScannerModal({ isOpen, onClose, onDetected }) {
  const [archivos, setArchivos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [mostrando, setMostrando] = useState("upload"); // "upload" o "results"
  const [zoomImage, setZoomImage] = useState(null); // Para el zoom de previews
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // AGREGAR a los archivos existentes, no reemplazar
    setArchivos((archivosAnteriores) => [...archivosAnteriores, ...files]);
    setError(null);
    setCargando(true);

    const newPreviews = [];

    try {
      for (const file of files) {
        if (file.type === "application/pdf") {
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

      // AGREGAR a los previews existentes
      setPreviews((previewsAnteriores) => [
        ...previewsAnteriores,
        ...newPreviews,
      ]);
      setCargando(false);
    } catch (err) {
      setError(`Error al procesar archivos: ${err.message}`);
      setCargando(false);
      setArchivos([]);
      setPreviews([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`mx-4 w-full rounded-xl bg-white shadow-xl ${
          mostrando === "results"
            ? "max-w-5xl max-h-[90vh] overflow-y-auto"
            : "max-w-md"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Título y descripción */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <RiveAnimation
                  src="/animations/robot-bouncing.riv"
                  className="h-12 w-12"
                />
                <div className="text-left">
                  <h2 className="text-lg font-bold text-slate-900">
                    OpenScan IA
                  </h2>
                </div>
              </div>
            </div>

            {/* Botón cerrar mejorado */}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-red-50 hover:border-red-300 hover:text-red-600 cursor-pointer"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {mostrando === "results" ? (
            <OcrResultsTable
              resultados={resultados}
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
          ) : (
            <>
              {/* Upload area */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Selecciona imágenes o PDFs de facturas (puedes cargar varias):
                </label>
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer">
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
                    className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="h-5 w-5" />
                  </button>

                  <p className="text-sm font-semibold text-slate-900">
                    {archivos.length > 0
                      ? `${archivos.length} archivo${archivos.length > 1 ? "s" : ""} cargado${archivos.length > 1 ? "s" : ""}`
                      : "Selecciona imagen o PDF"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {archivos.length > 0
                      ? archivos.map((a) => a.name).join(", ")
                      : "Foto de factura o archivo PDF"}
                  </p>
                </div>
              </div>

              {/* Previews */}
              {previews.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600">
                      Vista previa: {/*  ({previews.length})  */}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-200 transition cursor-pointer"
                      title="Agregar más archivos"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Agregar más
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {previews.map((item, idx) => (
                      <div
                        key={idx}
                        className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all"
                      >
                        {/* Botón de eliminar */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarArchivo(idx);
                          }}
                          className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md cursor-pointer active:scale-95"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Preview clickeable */}
                        <button
                          type="button"
                          onClick={() => setZoomImage(item.preview)}
                          className="w-full text-left hover:opacity-95 transition-opacity active:scale-95 cursor-pointer"
                        >
                          <div className="relative overflow-hidden h-32 bg-slate-100">
                            <img
                              src={item.preview}
                              alt={`Vista previa ${idx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            {/* Indicador de zoom */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                              <div className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                🔍
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Nombre del archivo */}
                        <p className="truncate bg-white px-2 py-2 text-xs text-slate-600 font-medium">
                          {item.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Footer - Solo en modo upload */}
              <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={handleClose}
                  disabled={cargando}
                  className="
      flex-1 rounded-lg
      border border-red-300
      bg-red
      px-4 py-2
      font-semibold text-slate-700
      transition-all duration-200
      hover:border-red-300
      hover:bg-red-50
      hover:text-red-600
      active:scale-95
      disabled:cursor-not-allowed
      disabled:opacity-50
      cursor-pointer
    "
                >
                  Cancelar
                </button>
                <button
                  onClick={procesarImagen}
                  disabled={archivos.length === 0 || cargando}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  {cargando ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Procesando {archivos.length}{" "}
                      {archivos.length === 1 ? "archivo" : "archivos"}...
                    </>
                  ) : (
                    `Extraer datos`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zoom de Previews */}
      <ImageZoomLightbox src={zoomImage} onClose={() => setZoomImage(null)} />

      {/* Modal de Loading con Rive */}
      {cargando && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            {/* Animación Rive */}
            <RiveAnimation
              src="/animations/robot-bouncing.riv"
              className="h-40 w-40"
            />

            {/* Texto */}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Extrayendo datos...
              </h3>
              <p className="text-sm text-slate-500">
                Analizando {archivos.length}{" "}
                {archivos.length === 1 ? "archivo" : "archivos"}
              </p>
            </div>

            {/* Animación de progreso - Barra */}
            <div className="w-full space-y-3">
              <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" style={{
                  animation: 'slideProgress 2s ease-in-out infinite'
                }} />
              </div>
              <style>{`
                @keyframes slideProgress {
                  0%, 100% { left: 0; width: 33%; }
                  50% { left: 67%; width: 33%; }
                }
              `}</style>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
