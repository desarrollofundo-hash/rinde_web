import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Diálogo con el resultado del guardado por lote del escáner OCR.
 * Muestra las facturas que se guardaron y las que fallaron (con el motivo real
 * del SP, por ejemplo duplicadas). "Entendido" cierra todo el flujo.
 *
 * @param {boolean}  isOpen
 * @param {Array<{ref:string,total:string,moneda:string,idRend:*}>} saved   Facturas guardadas
 * @param {Array<{ref:string,msg:string,esDuplicado:boolean}>}      failed  Facturas con error
 * @param {Function} onClose
 */
export default function SaveResultDialog({
  isOpen,
  saved = [],
  failed = [],
  onClose,
}) {
  if (!isOpen) return null;

  const hayDuplicados = failed.some((e) => e.esDuplicado);
  const hayRucInvalido = failed.some((e) => e.esRucInvalido);
  const todoBien = failed.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              todoBien ? "bg-green-100" : "bg-amber-100"
            }`}
          >
            {todoBien ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Resultado del guardado
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {saved.length > 0
                ? `${saved.length} guardada(s) correctamente`
                : "Ninguna se guardó"}
              {failed.length > 0 && ` · ${failed.length} con problema`}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Guardadas */}
          {saved.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                Guardadas ({saved.length})
              </p>
              {saved.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {g.ref}
                      </span>
                      {g.proveedor && (
                        <p className="truncate text-[11px] text-slate-500">
                          {g.proveedor}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-green-700">
                    {g.total} {g.moneda}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Con problema */}
          {failed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Con problema ({failed.length})
              </p>
              {failed.map((e, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {e.ref}
                    </span>
                    {e.esDuplicado && (
                      <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Duplicada
                      </span>
                    )}
                    {e.esRucInvalido && (
                      <span className="shrink-0 rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                        RUC no coincide
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    {e.msg}
                  </p>
                </div>
              ))}
              {hayDuplicados && (
                <p className="pt-1 text-xs text-slate-500">
                  Las facturas duplicadas ya están registradas y no se vuelven a
                  guardar.
                </p>
              )}
              {hayRucInvalido && (
                <p className="pt-1 text-xs text-slate-500">
                  Las facturas cuyo RUC de cliente no coincide con la empresa
                  logueada no se guardan, para evitar registrar gastos de otra
                  empresa.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
