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
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-1.5">
                <label className={labelClass}>Adjuntar evidencia</label>
                {hasEvidencia && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                        Archivo cargado
                    </span>
                )}
            </div>


            <div className="relative mt-2 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-linear-to-br from-slate-50 to-white transition hover:border-cyan-400 hover:bg-cyan-50/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                <input
                    key={inputResetKey}
                    type="file"
                    name="evidencia"
                    accept="image/*,.pdf"
                    onChange={onFileChange}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    aria-label="Seleccionar evidencia"
                />

                <div className="pointer-events-none flex items-center justify-between gap-2 px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-left">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-500 shadow-sm">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M12 16V4" />
                                <path d="m7 9 5-5 5 5" />
                                <path d="M20 16.5A3.5 3.5 0 0 0 16.5 13H16a5 5 0 1 0-9.8 1.5A3 3 0 0 0 6 20h12a2 2 0 0 0 2-2z" />
                            </svg>
                        </span>

                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold leading-4 text-slate-700">
                                {hasEvidencia ? "Cambiar archivo" : "Seleccionar archivo"}
                            </p>
                            <p className="text-[10px] leading-3 text-slate-500">Imagen o PDF</p>
                        </div>
                    </div>

                    <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Explorar
                    </span>
                </div>
            </div>

            {hasEvidencia && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                    <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" />
                            </svg>
                        </span>
                        <span className="max-w-full truncate text-[10px] font-medium text-slate-700" title={fileName}>
                            {fileName}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-100"
                            onClick={onOpenPreview}
                        >
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            Ver
                        </button>

                        {canCropImage && (
                            <button
                                type="button"
                                className="inline-flex items-center rounded-md bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-cyan-700"
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
