import AnimatedTrash from "@/Icons/AnimatedTrash";
import Update from "@/Icons/update";
import { X, AlertCircle } from "lucide-react";
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
  const [isTrashHovered, setIsTrashHovered] = useState(false);

  const handleSaveWithAPI = () => {
    // La factura escaneada aún no existe en la base (no tiene idRend), así que
    // aquí solo se actualiza la fila en memoria. El guardado real ocurre en
    // "Guardar (N)" de OcrResultsTable, que arma el payload completo.
    onSave(index, formData);
    onClose();
  };

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
    10: "RECIBO POR HONORARIO",
    11: "OTROS",
  };

  const monedas = {
    "01": "PEN (S/)",
    "03": "USD ($)",
  };

  return (
    <>
      {/* Modal de Edición */}
      <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-8">
        <div
          className={`flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] rounded-t-2xl sm:max-h-[90vh] sm:rounded-[1.35rem] ${
            showConfirmDelete ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-indigo-50 px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-7 w-1 rounded-full bg-linear-to-b from-blue-600 via-blue-700 to-indigo-500 sm:h-9" />
              <h2 className="min-w-0 text-sm font-extrabold text-slate-800 sm:text-base">
                Editar Registro:
              </h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 cursor-pointer sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-linear-to-b from-white to-slate-50/70">
            <div className="space-y-2.5 p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-3 sm:p-6">
              {/* Fila 1: RUC Emisor y Razón Social */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    RUC Emisor:
                  </label>
                  <input
                    type="text"
                    value={formData.rucEmisor || ""}
                    onChange={(e) => handleChange("rucEmisor", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="10077149231"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Razón Social Emisor:
                  </label>
                  <input
                    type="text"
                    value={formData.razonSocial || ""}
                    onChange={(e) =>
                      handleChange("razonSocial", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="GUES HOUSE"
                  />
                </div>
              </div>

              {/* Fila 2: RUC Cliente y Razón Social Cliente */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    RUC Cliente:
                  </label>
                  <input
                    type="text"
                    value={formData.rucCliente || ""}
                    onChange={(e) => handleChange("rucCliente", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="20603461534"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Razón Social Cliente:
                  </label>
                  <input
                    type="text"
                    value={formData.razonSocialCliente || ""}
                    onChange={(e) =>
                      handleChange("razonSocialCliente", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="AGRICOLA SANTA AZUL S.A.C"
                  />
                </div>
              </div>

              {/* Fila 3: Tipo y Moneda */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Tipo de Comprobante:
                  </label>
                  <select
                    value={formData.tipoComprobante || ""}
                    onChange={(e) =>
                      handleChange("tipoComprobante", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
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
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Moneda:
                  </label>
                  <select
                    value={formData.moneda || ""}
                    onChange={(e) => handleChange("moneda", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
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

              {/* Fila 4: Serie, Número, Fecha */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Serie:
                  </label>
                  <input
                    type="text"
                    value={formData.serie || ""}
                    onChange={(e) => handleChange("serie", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="FPP1"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Número:
                  </label>
                  <input
                    type="text"
                    value={formData.numero || ""}
                    onChange={(e) => handleChange("numero", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="002356"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Fecha:
                  </label>
                  <input
                    type="date"
                    value={formData.fecha || ""}
                    onChange={(e) => handleChange("fecha", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              </div>

              {/* Fila 5: IGV y Total */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    IGV:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.igv || ""}
                    onChange={(e) => handleChange("igv", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="0.77"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Total:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total || ""}
                    onChange={(e) => handleChange("total", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="27.00"
                  />
                </div>
              </div>
              {/* Fila 6: Glosa */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                  Glosa:
                </label>
                <textarea
                  value={formData.glosa || ""}
                  onChange={(e) => handleChange("glosa", e.target.value)}
                  placeholder="Agrega una descripción breve del gasto o nota"
                  className="min-h-20 w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 sm:px-3 text-base sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 flex shrink-0 gap-2 border-t border-slate-200 bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-4">
            {/* Botón Quitar - Solo icono en móvil */}
            <button
              onClick={() => setShowConfirmDelete(true)}
              title="Quitar gasto"
              onMouseEnter={() => setIsTrashHovered(true)}
              onMouseLeave={() => setIsTrashHovered(false)}
              className="group inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 active:scale-95 transition cursor-pointer sm:gap-2 sm:px-3 h-10 w-10 sm:h-auto sm:w-auto sm:py-2"
            >
              <AnimatedTrash
                className="h-5 w-5 text-red-700"
                isHovered={isTrashHovered}
              />

              <span className="hidden sm:inline text-sm font-semibold text-red-700">
                Quitar
              </span>
            </button>
            <div className="flex-1" />

            {/* Botón Cancelar - Solo icono en móvil */}
            {/*  <button
              onClick={onClose}
              title="Cancelar"
              className="group inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 transition cursor-pointer sm:gap-2 sm:px-3 h-10 w-10 sm:h-auto sm:w-auto sm:py-2"
            >
              <X className="h-4 w-4 text-slate-700 transition-transform duration-300 group-hover:rotate-90" />
              <span className="hidden sm:inline text-sm font-semibold text-slate-700">
                Cancelar
              </span>
            </button> */}

            {/* Botón Guardar - Solo icono en móvil */}
            <button
              onClick={handleSaveWithAPI}
              title="Actualizar gasto"
              className="group inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 transition cursor-pointer sm:gap-2 sm:px-3 h-10 w-10 sm:h-auto sm:w-auto sm:py-2"
            >
              <Update className="h-4 w-4 text-white transition-transform duration-500 group-hover:rotate-180" />
              <span className="hidden sm:inline text-sm font-semibold text-white">
                Actualizar
              </span>
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
                  <strong>Comprobante:</strong> {formData.serie}-
                  {formData.numero}
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
