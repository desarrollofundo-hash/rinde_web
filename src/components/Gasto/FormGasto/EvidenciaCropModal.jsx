import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export default function EvidenciaCropModal({
    isOpen,
    hasEvidencia,
    canCropImage,
    isCropMode,
    onClose,
    onStartCrop,
    onCancelCrop,
    onApplyCrop,
    previewUrl,
    fileName,
    crop,
    onChangeCrop,
    onCompleteCrop,
    selectedAspect,
    cropShape,
    onImageLoaded,
    selectedPreset,
    onSelectPreset,
    cropPresets,
    onSetCropShape,
    onReset,
}) {
    if (!isOpen || !hasEvidencia) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-800">Vista previa de evidencia</h4>
                    <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>

                {canCropImage && isCropMode ? (
                    <>
                        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-96">
                            <div className="h-full overflow-auto p-2">
                                <ReactCrop
                                    crop={crop}
                                    onChange={onChangeCrop}
                                    onComplete={onCompleteCrop}
                                    aspect={selectedAspect || undefined}
                                    keepSelection
                                    circularCrop={cropShape === "round"}
                                    className="max-h-full"
                                >
                                    <img
                                        src={previewUrl}
                                        alt="Recorte de evidencia"
                                        className="mx-auto max-h-90 w-auto object-contain"
                                        onLoad={onImageLoaded}
                                    />
                                </ReactCrop>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Tipo de recorte</label>
                                <div className="flex flex-wrap gap-2">
                                    {cropPresets.map((preset) => (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${selectedPreset === preset.key
                                                ? "bg-cyan-600 text-white"
                                                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                                                }`}
                                            onClick={() => onSelectPreset(preset.key)}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Forma</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cropShape === "rect"
                                            ? "bg-slate-700 text-white"
                                            : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                                            }`}
                                        onClick={() => onSetCropShape("rect")}
                                    >
                                        Rectangulo
                                    </button>
                                    <button
                                        type="button"
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cropShape === "round"
                                            ? "bg-slate-700 text-white"
                                            : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                                            }`}
                                        onClick={() => onSetCropShape("round")}
                                    >
                                        Circulo
                                    </button>
                                </div>
                            </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-600">
                            Arrastra las esquinas o bordes del recuadro para redimensionar, y arrastralo para moverlo.
                        </p>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={onReset}
                            >
                                Reiniciar
                            </button>
                            <button
                                type="button"
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={onCancelCrop}
                            >
                                Cancelar recorte
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                onClick={onApplyCrop}
                            >
                                Aplicar recorte
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        {canCropImage ? (
                            <img
                                src={previewUrl}
                                alt="Vista previa evidencia"
                                className="mx-auto max-h-[65vh] rounded-lg object-contain"
                            />
                        ) : (
                            <div className="text-sm text-slate-600">
                                <p>Este archivo no es imagen. Se enviara tal cual al guardar.</p>
                                <p className="mt-1 font-semibold">{fileName}</p>
                            </div>
                        )}

                        {canCropImage && (
                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                                    onClick={onStartCrop}
                                >
                                    Recortar imagen
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
