import { AlertTriangle, Check, X } from "lucide-react";

export default function RucValidationDialog({
    isOpen,
    rucClienteOcr,
    rucEmpresa,
    onAccept,
    onCancel,
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header - Rojo/Advertencia */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-white" />
                        <h2 className="text-lg font-bold text-white">RUC NO COINCIDE</h2>
                    </div>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm leading-relaxed text-slate-600">
                        El RUC del cliente en la factura no coincide con la empresa logueada. Verifica antes de continuar.
                    </p>

                    {/* Comparación de RUCs */}
                    <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                        {/* RUC Factura */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                RUC en Factura
                            </p>
                            <p className="mt-1 font-mono text-lg font-bold text-red-600">
                                {rucClienteOcr}
                            </p>
                        </div>

                        {/* Separador */}
                        <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-200" />
                            <X className="h-4 w-4 text-red-500" />
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {/* RUC Empresa */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                RUC Empresa Activa
                            </p>
                            <p className="mt-1 font-mono text-lg font-bold text-blue-600">
                                {rucEmpresa}
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">
                        ¿Deseas continuar de todas formas?
                    </p>
                </div>

                {/* Footer - Botones */}
                <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                    >
                        <X className="h-4 w-4" />
                        Cancelar
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 font-semibold text-white transition hover:from-orange-600 hover:to-red-600 active:scale-95"
                    >
                        <Check className="h-4 w-4" />
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
