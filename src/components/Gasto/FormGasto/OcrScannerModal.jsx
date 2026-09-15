import { useState, useRef } from "react";
import { X, Upload, Loader, AlertCircle } from "lucide-react";
import { extraerDatosComprobante } from "../../../services/ocrExtraction";
import OcrResultsTable from "./OcrResultsTable";
import * as pdfjsLib from "pdfjs-dist";

export default function OcrScannerModal({ isOpen, onClose, onDetected }) {
  const [archivos, setArchivos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [mostrando, setMostrando] = useState("upload"); // "upload" o "results"
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setArchivos(files);
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

      setPreviews(newPreviews);
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

      // Si hay 2 o más, mostrar tabla de resultados
      if (todosLosDatos.length >= 2) {
        setResultados(todosLosDatos);
        setMostrando("results");
      } else {
        // Si es solo 1, devolver directamente
        onDetected(todosLosDatos[0]);
        limpiar();
        onClose();
      }
    } catch (err) {
      setError(err.message || "Error al procesar las imágenes");
    } finally {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`mx-4 w-full rounded-xl bg-white shadow-xl ${
        mostrando === "results" ? "max-w-5xl max-h-[90vh] overflow-y-auto" : "max-w-md"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">OpenScan IA </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {mostrando === "results" ? (
            <OcrResultsTable
              resultados={resultados}
              onConfirm={() => {
                onDetected(resultados);
                limpiar();
                onClose();
              }}
              onCancel={() => {
                setMostrando("upload");
                setResultados([]);
              }}
            />
          ) : (
          {/* Upload area */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Selecciona imágenes o PDFs de facturas (puedes cargar varias):
            </label>
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-3 text-xs font-semibold text-slate-600">
                Vista previa ({previews.length}):
              </p>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {previews.map((item, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <img
                      src={item.preview}
                      alt={`Vista previa ${idx + 1}`}
                      className="h-32 w-full object-cover"
                    />
                    <p className="truncate bg-white px-2 py-1 text-xs text-slate-600">
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
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={handleClose}
            disabled={cargando}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
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
                Procesando {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"}...
              </>
            ) : (
              `Extraer datos (${archivos.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
