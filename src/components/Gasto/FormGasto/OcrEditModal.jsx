import { X, Save, Trash2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function OcrEditModal({
  isOpen,
  item,
  index,
  onSave,
  onDelete,
  onClose,
}) {
  const [formData, setFormData] = useState(item || {});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Actualizar formData cuando cambia el item
  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setShowConfirmDelete(false);
    }
  }, [item, isOpen]);

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
    <>
      {/* Modal de Edición */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className={`w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col ${
          showConfirmDelete ? "opacity-50 pointer-events-none" : ""
        }`}>
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex-1">
              <h2 className="text-base sm:text-lg font-bold text-white">
                ✏️ Editar Registro #{index + 1}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 p-4 sm:p-6">
              {/* Sección: Datos del Emisor */}
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-3">📤 DATOS DEL EMISOR</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      RUC Emisor
                    </label>
                    <input
                      type="text"
                      value={formData.rucEmisor || ""}
                      onChange={(e) => handleChange("rucEmisor", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="10077149231"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Razón Social Emisor
                    </label>
                    <input
                      type="text"
                      value={formData.razonSocial || ""}
                      onChange={(e) => handleChange("razonSocial", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="GUES HOUSE"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Datos del Cliente */}
              <div className="rounded-lg border border-green-100 bg-green-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-green-900 mb-3">📥 DATOS DEL CLIENTE</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      RUC Cliente
                    </label>
                    <input
                      type="text"
                      value={formData.rucCliente || ""}
                      onChange={(e) => handleChange("rucCliente", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="20603461534"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Razón Social Cliente
                    </label>
                    <input
                      type="text"
                      value={formData.razonSocialCliente || ""}
                      onChange={(e) => handleChange("razonSocialCliente", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="AGRICOLA SANTA AZUL S.A.C"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Tipo de Comprobante */}
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-purple-900 mb-3">📄 TIPO DE COMPROBANTE</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Tipo de Comprobante
                    </label>
                    <select
                      value={formData.tipoComprobante || ""}
                      onChange={(e) => handleChange("tipoComprobante", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    >
                      <option value="">Selecciona tipo</option>
                      {Object.entries(tiposComprobante).map(([code, name]) => (
                        <option key={code} value={code}>
                          {code} - {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Moneda
                    </label>
                    <select
                      value={formData.moneda || ""}
                      onChange={(e) => handleChange("moneda", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
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
              </div>

              {/* Sección: Datos del Comprobante */}
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-orange-900 mb-3">🔢 DATOS DEL COMPROBANTE</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Serie
                    </label>
                    <input
                      type="text"
                      value={formData.serie || ""}
                      onChange={(e) => handleChange("serie", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="FPP1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formData.numero || ""}
                      onChange={(e) => handleChange("numero", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="002356"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={formData.fecha || ""}
                      onChange={(e) => handleChange("fecha", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Montos */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-emerald-900 mb-3">💰 MONTOS</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      IGV
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.igv || ""}
                      onChange={(e) => handleChange("igv", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="0.77"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total || ""}
                      onChange={(e) => handleChange("total", e.target.value)}
                      className="w-full rounded-lg border-2 border-emerald-500 px-3 py-2 text-sm font-bold text-emerald-600 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      placeholder="27.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 active:scale-95 transition cursor-pointer order-last sm:order-first"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Quitar gasto</span>
              <span className="sm:hidden">Quitar</span>
            </button>

            <div className="flex-1 hidden sm:block" />

            <button
              onClick={onClose}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>

            <button
              onClick={() => onSave(index, formData)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-600 hover:to-blue-700 active:scale-95 transition cursor-pointer shadow-md"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Guardar cambios</span>
              <span className="sm:hidden">Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[51] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ¿Quitar este gasto?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <div className="space-y-3 px-6 py-4">
              <p className="text-sm text-slate-700">
                <strong>Registro #{index + 1}</strong>
              </p>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm">
                  <strong>Emisor:</strong> {formData.razonSocial}
                </p>
                <p className="text-sm">
                  <strong>Comprobante:</strong> {formData.serie}-{formData.numero}
                </p>
                <p className="text-sm">
                  <strong>Total:</strong> {formData.total}
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(index);
                  setShowConfirmDelete(false);
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                Sí, quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
