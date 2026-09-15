import { AlertTriangle, Check, X } from "lucide-react";

export default function RucValidationDialog({
  isOpen,
  rucClienteOcr,
  rucEmpresa,
  razonSocialOcr,
  razonSocialEmpresa,
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
          <p className="text-sm leading-relaxed font-semibold text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
            ⚠️ La empresa de la factura NO coincide con la empresa seleccionada.
            Verifica que has elegido la empresa correcta antes de continuar.
          </p>

          {/* Comparación de RUCs */}
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            {/* RUC Factura */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                🔴 Factura (Cliente)
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-red-600">
                RUC: {rucClienteOcr}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {razonSocialOcr || "—"}
              </p>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <X className="h-5 w-5 text-red-500 font-bold" />
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* RUC Empresa */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                🟢 Empresa Logueada
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-blue-600">
                RUC: {rucEmpresa}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {razonSocialEmpresa || "—"}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 bg-yellow-50 p-2.5 rounded border border-yellow-200">
            ❓ Si esta es la factura correcta, haz clic en "Continuar". Si cometiste un error, cambia de empresa.
          </p>
        </div>

        {/* Footer - Botones */}
        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-400 active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            onClick={onAccept}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 font-semibold text-white transition hover:from-orange-600 hover:to-red-600 active:scale-95 cursor-pointer shadow-md"
          >
            <Check className="h-4 w-4" />
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
