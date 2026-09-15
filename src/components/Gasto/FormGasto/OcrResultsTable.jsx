import { Check, X, ZoomIn, Plus, Minus, Edit2 } from "lucide-react";
import { useState } from "react";

export default function OcrResultsTable({
  resultados,
  onConfirm,
  onCancel,
  onEdit,
}) {
  const [zoomImage, setZoomImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const tiposComprobante = {
    "01": "FACTURA ELECTRONICA",
    "03": "BOLETA DE VENTA",
    "07": "NOTA DE CREDITO",
    "08": "NOTA DE DEBITO",
    "10": "RECIBO POR HONORARIO",
    "11": "OTROS",
  };

  const monedas = {
    "01": "PEN",
    "03": "USD",
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleOpenZoom = (preview) => {
    setZoomImage(preview);
    setZoomLevel(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">
          Resultados OCR ({resultados.length} registros)
        </h3>
        <p className="text-xs text-slate-600">
          Revisa los datos extraídos antes de guardar
        </p>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          {/* Header */}
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">RUC Emisor</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Emisor</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">RUC Cliente</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Cliente</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Tipo</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Serie-Número</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Fecha</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">IGV</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Total</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Moneda</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-700">Evidencia</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {resultados.map((item, idx) => (
              <tr
                key={idx}
                className={`border-b border-slate-200 hover:bg-blue-50/50 transition ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                }`}
              >
                <td className="px-3 py-3 font-bold text-slate-700">{idx + 1}</td>
                <td className="px-3 py-3 font-mono text-sm font-semibold text-red-600">
                  {item.rucEmisor}
                </td>
                <td className="px-3 py-3 text-slate-900 max-w-[120px] truncate">
                  {item.razonSocial}
                </td>
                <td className="px-3 py-3 font-mono text-sm font-semibold text-blue-600">
                  {item.rucCliente}
                </td>
                <td className="px-3 py-3 text-slate-900 max-w-[120px] truncate">
                  {item.razonSocialCliente || "—"}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {tiposComprobante[item.tipoComprobante]?.split(" ")[0] ||
                      item.tipoComprobante}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-700">
                  {item.serie}-{item.numero}
                </td>
                <td className="px-3 py-3 text-slate-700 text-sm">
                  {item.fecha}
                </td>
                <td className="px-3 py-3 text-slate-700 font-semibold">
                  S/ {item.igv}
                </td>
                <td className="px-3 py-3 font-bold text-green-600 text-base">
                  {monedas[item.moneda] || "PEN"} {item.total}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {monedas[item.moneda] || "PEN"}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {item.preview && (
                    <button
                      onClick={() => handleOpenZoom(item.preview)}
                      className="inline-flex items-center justify-center h-12 w-12 rounded-lg border border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer group"
                      title="Haz clic para ampliar"
                    >
                      <img
                        src={item.preview}
                        alt="Evidencia"
                        className="h-10 w-10 rounded object-cover group-hover:opacity-80"
                      />
                    </button>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => onEdit?.(idx, item)}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition cursor-pointer gap-1.5"
                    title="Editar este registro"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Zoom */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative mx-4 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Controles de zoom */}
            <div className="flex items-center gap-3 rounded-lg bg-white/95 backdrop-blur px-4 py-2 shadow-lg">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="inline-flex items-center justify-center h-8 w-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                title="Alejar"
              >
                <Minus className="h-4 w-4 text-slate-700" />
              </button>

              <span className="min-w-[60px] text-center font-semibold text-slate-700">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="inline-flex items-center justify-center h-8 w-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                title="Acercar"
              >
                <Plus className="h-4 w-4 text-slate-700" />
              </button>

              <div className="w-px h-6 bg-slate-300" />

              <button
                onClick={() => setZoomLevel(1)}
                className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition cursor-pointer"
                title="Restablecer zoom"
              >
                Restablecer
              </button>
            </div>

            {/* Imagen con zoom */}
            <div className="overflow-auto max-h-[70vh] max-w-[90vw] rounded-xl border-4 border-white shadow-2xl bg-white">
              <img
                src={zoomImage}
                alt="Zoom evidencia"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center",
                  transition: "transform 0.2s ease-out",
                }}
                className="w-full object-contain"
              />
            </div>

            {/* Botón cerrar */}
            <button
              onClick={() => setZoomImage(null)}
              className="absolute right-4 top-4 inline-flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-lg hover:bg-slate-100 transition cursor-pointer z-10"
              title="Cerrar"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:from-green-600 hover:to-emerald-700 active:scale-95 cursor-pointer shadow-md"
        >
          <Check className="h-4 w-4" />
          Guardar todos ({resultados.length})
        </button>
      </div>
    </div>
  );
}
