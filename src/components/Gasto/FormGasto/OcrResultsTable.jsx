import { Check, X, Edit2, Trash2, AlertCircle } from "lucide-react";
import { useState } from "react";
import ImageZoomLightbox from "../ImageZoomLightbox";
import OcrEditModal from "./OcrEditModal";

export default function OcrResultsTable({
  resultados: initialResultados,
  onConfirm,
  onCancel,
}) {
  const [resultados, setResultados] = useState(initialResultados);
  const [zoomImage, setZoomImage] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);

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

  const handleEdit = (idx) => {
    setEditingIndex(idx);
  };

  const handleSaveEdit = (idx, updatedData) => {
    const newResultados = [...resultados];
    newResultados[idx] = updatedData;
    setResultados(newResultados);
    setEditingIndex(null);
  };

  const handleDeleteGasto = (idx) => {
    const newResultados = resultados.filter((_, i) => i !== idx);
    setResultados(newResultados);
    setEditingIndex(null);
    setDeleteConfirmIndex(null);
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
                      onClick={() => setZoomImage(item.preview)}
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
                <td className="px-3 py-3 text-center flex gap-2 justify-center">
                  <button
                    onClick={() => handleEdit(idx)}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition cursor-pointer gap-1.5"
                    title="Editar este registro"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmIndex(idx)}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition cursor-pointer"
                    title="Eliminar este gasto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Zoom usando componente existente */}
      <ImageZoomLightbox src={zoomImage} onClose={() => setZoomImage(null)} />

      {/* Modal de Edición */}
      <OcrEditModal
        isOpen={editingIndex !== null}
        item={resultados[editingIndex] || null}
        index={editingIndex}
        onSave={handleSaveEdit}
        onDelete={handleDeleteGasto}
        onClose={() => setEditingIndex(null)}
      />

      {/* Modal de Confirmación de Eliminación en Tabla */}
      {deleteConfirmIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ¿Eliminar este gasto?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <div className="space-y-3 px-6 py-4">
              <p className="text-sm text-slate-700">
                <strong>Registro #{deleteConfirmIndex + 1}</strong>
              </p>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm">
                  <strong>Emisor:</strong> {resultados[deleteConfirmIndex]?.razonSocial}
                </p>
                <p className="text-sm">
                  <strong>Comprobante:</strong> {resultados[deleteConfirmIndex]?.serie}-{resultados[deleteConfirmIndex]?.numero}
                </p>
                <p className="text-sm">
                  <strong>Total:</strong> {resultados[deleteConfirmIndex]?.total}
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setDeleteConfirmIndex(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleDeleteGasto(deleteConfirmIndex);
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
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
          onClick={() => onConfirm(resultados)}
          disabled={resultados.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:from-green-600 hover:to-emerald-700 active:scale-95 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-4 w-4" />
          Guardar todos ({resultados.length})
        </button>
      </div>
    </div>
  );
}
