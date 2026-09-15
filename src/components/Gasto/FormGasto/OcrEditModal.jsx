import { X, Save, Trash2 } from "lucide-react";
import { useState } from "react";

export default function OcrEditModal({
  isOpen,
  item,
  index,
  onSave,
  onDelete,
  onClose,
}) {
  const [formData, setFormData] = useState(item || {});

  if (!isOpen || !item) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const tiposComprobante = {
    "01": "FACTURA ELECTRONICA",
    "03": "BOLETA DE VENTA",
    "07": "NOTA DE CREDITO",
    "08": "NOTA DE DEBITO",
    "10": "RECIBO POR HONORARIO",
    "11": "OTROS",
  };

  const monedas = {
    "01": "PEN (S/)",
    "03": "USD ($)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Editar Registro #{index + 1}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* RUC Emisor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                RUC Emisor
              </label>
              <input
                type="text"
                value={formData.rucEmisor || ""}
                onChange={(e) => handleChange("rucEmisor", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="10077149231"
              />
            </div>

            {/* Razón Social Emisor */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Razón Social Emisor
              </label>
              <input
                type="text"
                value={formData.razonSocial || ""}
                onChange={(e) => handleChange("razonSocial", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="GUES HOUSE"
              />
            </div>
          </div>

          {/* RUC Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                RUC Cliente
              </label>
              <input
                type="text"
                value={formData.rucCliente || ""}
                onChange={(e) => handleChange("rucCliente", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="20603461534"
              />
            </div>

            {/* Razón Social Cliente */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Razón Social Cliente
              </label>
              <input
                type="text"
                value={formData.razonSocialCliente || ""}
                onChange={(e) => handleChange("razonSocialCliente", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="AGRICOLA SANTA AZUL S.A.C"
              />
            </div>
          </div>

          {/* Tipo Comprobante */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Tipo de Comprobante
              </label>
              <select
                value={formData.tipoComprobante || ""}
                onChange={(e) => handleChange("tipoComprobante", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="">Selecciona tipo</option>
                {Object.entries(tiposComprobante).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.moneda || ""}
                onChange={(e) => handleChange("moneda", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="">Selecciona moneda</option>
                {Object.entries(monedas).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Serie y Número */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Serie
              </label>
              <input
                type="text"
                value={formData.serie || ""}
                onChange={(e) => handleChange("serie", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="FPP1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Número
              </label>
              <input
                type="text"
                value={formData.numero || ""}
                onChange={(e) => handleChange("numero", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="002356"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={formData.fecha || ""}
                onChange={(e) => handleChange("fecha", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </div>

          {/* IGV y Total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                IGV
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.igv || ""}
                onChange={(e) => handleChange("igv", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="0.77"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Total
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total || ""}
                onChange={(e) => handleChange("total", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-green-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="27.00"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={() => onDelete(index)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100 active:scale-95 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Quitar gasto
          </button>

          <div className="flex-1" />

          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>

          <button
            onClick={() => onSave(index, formData)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 font-semibold text-white transition hover:from-blue-600 hover:to-blue-700 active:scale-95 cursor-pointer shadow-md"
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
