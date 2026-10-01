import { QrCode, Camera } from "lucide-react";
import RiveAnimation from "../../RiveAnimation";
import CloudinaryIcon from "@/Icons/CloudinaryIcon";

// Tarjeta para subir la evidencia (imagen/PDF). Se exporta con nombre porque,
// además de usarse aquí dentro de la grilla, EditarGastoModal la usa suelta.
export function EvidenciaUploader({
  formData,
  hasEvidencia,
  inputResetKey,
  onFileChange,
  previewUrl,
}) {
  const fileName = formData.evidencia?.name?.split("/").pop() || "";
  const isImage = hasEvidencia && String(formData.evidencia?.type || "").startsWith("image/");

  return (
    <button
      type="button"
      onClick={() => document.getElementById("evidencia-input")?.click()}
      className="group relative h-18 sm:h-19 lg:h-27.5 w-full overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl lg:px-4 lg:py-3"
    >
      <input
        id="evidencia-input"
        key={inputResetKey}
        type="file"
        name="evidencia"
        accept="image/*,.pdf"
        onChange={onFileChange}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
        aria-label="Seleccionar evidencia"
      />

      {/* Thumbnail de fondo cuando hay imagen */}
      {isImage && previewUrl && (
        <img
          src={previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-300 group-hover:opacity-30"
          aria-hidden="true"
        />
      )}

      {/* Hover */}
      <div className="absolute inset-0 bg-linear-to-br from-slate-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Contenido */}
      <div className="relative flex h-full items-center gap-2">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt="Vista previa"
            className="h-9 w-9 shrink-0 rounded-md object-cover shadow-sm ring-1 ring-slate-200 lg:h-11 lg:w-11"
          />
        ) : (
          <CloudinaryIcon
            size={40}
            className="transition-transform duration-600 group-hover:scale-110"
          />
        )}
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[11px] font-bold leading-tight text-slate-900 sm:text-xs lg:text-sm">
            {hasEvidencia ? "Cambiar archivo" : "Evidencia"}
          </p>

          <p className="truncate text-[9px] leading-tight text-slate-600 sm:text-[10px] lg:text-xs">
            {hasEvidencia ? fileName : "Imagen o PDF"}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function ScannerCardsGrid({
  onQrClick,
  onOcrClick,
  formData,
  hasEvidencia,
  inputResetKey,
  onFileChange,
  previewUrl,
  // En Planilla de Movilidad no hay factura que escanear: solo Evidencia y QR.
  showOcrCards = true,
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4 ${
        showOcrCards ? "lg:grid-cols-3" : "lg:grid-cols-2"
      }`}
    >
      {/* Evidencia: en móvil ocupa 1 columna para formar un 2×2 con las demás. */}
      <div className="lg:col-span-1">
        <EvidenciaUploader
          formData={formData}
          hasEvidencia={hasEvidencia}
          inputResetKey={inputResetKey}
          onFileChange={onFileChange}
          previewUrl={previewUrl}
        />
      </div>

      {/* QR */}
      <button
        type="button"
        onClick={onQrClick}
        className="group relative h-18 w-full overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl lg:h-27.5 lg:px-4 lg:py-3 cursor-pointer"
      >
        <div className="absolute inset-0 bg-linear-to-br from-slate-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex h-full items-center gap-1.5 lg:gap-2">
          <div className="shrink-0 rounded-md p-0.5 lg:p-2">
            <RiveAnimation
              src="/animations/barcode-scanner.riv"
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 scale-150"
            />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[10px] font-bold leading-tight text-slate-900 sm:text-xs lg:text-sm">
              Código QR
            </p>

            <p className="truncate text-[8px] leading-tight text-slate-600 sm:text-[10px] lg:text-xs">
              Escanea QR
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-slate-900 p-1.5 text-white lg:gap-1 lg:px-3 lg:py-1.5">
            <QrCode className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline text-xs font-semibold">
              Abrir
            </span>
          </span>
        </div>
      </button>

      {/* IA */}
      {showOcrCards && (
      <button
        type="button"
        onClick={onOcrClick}
        className="group relative h-18 w-full overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl lg:h-27.5 lg:px-4 lg:py-3 cursor-pointer"
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex h-full items-center gap-1.5 lg:gap-2">
          <div className="shrink-0 rounded-md  p-0.5 lg:p-2">
            <RiveAnimation
              src="/animations/robot-bouncing.riv"
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 scale-150"
            />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-bold leading-tight text-slate-900 sm:text-xs lg:text-sm">
                OpenScan
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 p-1.5 text-white lg:gap-1 lg:px-3 lg:py-1.5">
            <Camera className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline text-xs font-semibold">
              Subir
            </span>
          </span>
        </div>
      </button>
      )}
    </div>
  );
}
