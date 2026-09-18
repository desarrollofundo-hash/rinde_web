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
        <button
            type="button"
            onClick={() => document.getElementById("evidencia-input")?.click()}
            className="group relative h-[72px] sm:h-[76px] lg:h-[110px] rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white px-2 py-1.5 lg:px-4 lg:py-3 shadow-sm hover:shadow-xl hover:border-slate-400 hover:bg-slate-50/50 transition-all duration-300 overflow-hidden w-full"
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

            <div className="relative h-full flex items-center gap-2 lg:gap-3">
                <div className="p-1 lg:p-2 rounded-md bg-slate-200 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 16V4M7 9l5-5 5 5M20 16.5A3.5 3.5 0 0 0 16.5 13H16a5 5 0 1 0-9.8 1.5A3 3 0 0 0 6 20h12a2 2 0 0 0 2-2z" />
                    </svg>
                </div>

                <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-[11px] sm:text-xs lg:text-sm leading-tight">
                        {hasEvidencia ? "Cambiar archivo" : "Subir archivo"}
                    </p>
                    <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-600 leading-tight">
                        {hasEvidencia ? fileName.split("/").pop() : "Imagen o PDF"}
                    </p>
                </div>

                <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 text-white px-2 py-1 lg:px-3 lg:py-1.5 text-[9px] sm:text-[10px] lg:text-xs font-semibold">
                        {hasEvidencia ? (
                            <>
                                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span className="hidden sm:inline">OK</span>
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 16V4M7 9l5-5 5 5" />
                                </svg>
                                <span className="hidden sm:inline">Subir</span>
                            </>
                        )}
                    </span>
                </div>
            </div>
        </button>
    );
}
