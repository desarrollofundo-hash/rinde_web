export default function EvidenciaUploader({
    labelClass,
    formData,
    hasEvidencia,
    canCropImage,
    inputResetKey,
    onFileChange,
    onOpenPreview,
    onStartCrop,
}) {
    const fileName = formData.evidencia?.name || "";

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-2 lg:mb-3">
                <label className={`${labelClass} text-xs lg:text-sm`}>Adjuntar evidencia</label>
                {hasEvidencia && (
                    <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[8px] lg:text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                        ✓ Cargado
                    </span>
                )}
            </div>

            {/* Upload Area */}
            <div className="relative flex-1 overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white transition hover:border-cyan-400 hover:bg-cyan-50/30 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
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

                <div className="pointer-events-none h-full flex flex-col items-center justify-center gap-2 px-3 py-2 lg:py-3">
                    <div className="inline-flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 16V4M7 9l5-5 5 5M20 16.5A3.5 3.5 0 0 0 16.5 13H16a5 5 0 1 0-9.8 1.5A3 3 0 0 0 6 20h12a2 2 0 0 0 2-2z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] lg:text-xs font-bold text-slate-900">
                            {hasEvidencia ? "Cambiar archivo" : "Subir archivo"}
                        </p>
                        <p className="text-[9px] lg:text-[10px] text-slate-500">Imagen o PDF</p>
                    </div>
                </div>
            </div>

            {/* File Info */}
            {hasEvidencia && (
                <div className="mt-2 lg:mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 lg:p-2.5">
                    <div className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-emerald-600 flex-shrink-0" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        <span className="truncate text-[9px] lg:text-[10px] font-medium text-slate-700" title={fileName}>
                            {fileName}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 lg:mt-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 lg:px-2 lg:py-1 text-[9px] lg:text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
                            onClick={onOpenPreview}
                        >
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            Ver
                        </button>

                        {canCropImage && (
                            <button
                                type="button"
                                className="inline-flex items-center rounded-md bg-cyan-600 px-2 py-0.5 lg:px-2 lg:py-1 text-[9px] lg:text-[10px] font-semibold text-white transition hover:bg-cyan-700"
                                onClick={onStartCrop}
                            >
                                Recortar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
