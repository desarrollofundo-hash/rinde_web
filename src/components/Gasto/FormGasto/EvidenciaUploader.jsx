export default function EvidenciaUploader({
    labelClass,
    formData,
    hasEvidencia,
    canCropImage,
    onFileChange,
    onOpenPreview,
    onStartCrop,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className={labelClass}>Adjuntar evidencia</label>
            <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 cursor-pointer hover:bg-slate-200 transition">
                <input
                    type="file"
                    name="evidencia"
                    accept="image/*,.pdf"
                    onChange={onFileChange}
                    className="w-full text-sm text-slate-600"
                />
            </div>

            {hasEvidencia && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="max-w-full truncate text-xs font-medium text-slate-600">
                        {formData.evidencia?.name}
                    </span>

                    <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={onOpenPreview}
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        Ver
                    </button>

                    {canCropImage && (
                        <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700"
                            onClick={onStartCrop}
                        >
                            Recortar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
