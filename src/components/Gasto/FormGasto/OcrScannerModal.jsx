import { useState, useRef } from "react";
import { X, Upload, Loader, AlertCircle } from "lucide-react";
import { extraerDatosComprobante } from "../../../services/ocrExtraction";
import * as pdfjsLib from "pdfjs-dist";

export default function OcrScannerModal({ isOpen, onClose, onDetected }) {
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setError(null);

    // Si es PDF, convertir a imagen para preview
    if (file.type === "application/pdf") {
      try {
        setCargando(true);
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

        setPreview(canvas.toDataURL("image/png"));
        setCargando(false);
      } catch (err) {
        setError(`Error al procesar PDF: ${err.message}`);
        setCargando(false);
        setArchivo(null);
        setPreview(null);
      }
    } else {
      // Si es imagen, mostrar preview normalmente
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const procesarImagen = async () => {
    if (!archivo) {
      setError("Por favor selecciona una imagen de factura");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const datos = await extraerDatosComprobante(archivo);
      onDetected(datos);
      limpiar();
      onClose();
    } catch (err) {
      setError(err.message || "Error al procesar la imagen");
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setPreview(null);
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
      <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-xl">
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
          {/* Upload area */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Selecciona una imagen o PDF de factura:
            </label>
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={cargando}
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
                {archivo ? "Archivo cargado" : "Selecciona imagen o PDF"}
              </p>
              <p className="text-xs text-slate-600">
                {archivo ? archivo.name : "Foto de factura o archivo PDF"}
              </p>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <img
                src={preview}
                alt="Vista previa"
                className="h-48 w-full object-cover rounded-lg"
              />
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
            disabled={!archivo || cargando}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {cargando ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Extraer datos"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
