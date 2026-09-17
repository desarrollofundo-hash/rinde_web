import { QrCode, Camera } from "lucide-react";
import RiveAnimation from "../../RiveAnimation";
import EvidenciaUploader from "./EvidenciaUploader";

export default function ScannerCardsGrid({
  onQrClick,
  onOcrClick,
  onCameraClick,
  labelClass,
  formData,
  hasEvidencia,
  canCropImage,
  inputResetKey,
  onFileChange,
  onOpenPreview,
  onStartCrop,
}) {
  return (
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
            inputResetKey={inputResetKey}
            onFileChange={onFileChange}
            onOpenPreview={onOpenPreview}
            onStartCrop={onStartCrop}
          />
        </div>
      </div>

      {/* Scanners - 3 Columnas */}
      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* QR Scanner */}
        <button
          type="button"
          onClick={onQrClick}
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
          onClick={onOcrClick}
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
          onClick={onCameraClick}
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
  );
}
