import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useState } from "react";

export default function OcrResultsTable({
  resultados,
  onConfirm,
  onCancel,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (idx) => {
    setExpandedRows((prev) => ({
      ...prev,
      [idx]: !prev[idx],
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
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                RUC Emisor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Emisor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                RUC Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Comprobante
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">
                Evidencia
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">
                Detalles
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {resultados.map((item, idx) => (
              <tbody key={idx}>
                {/* Row principal */}
                <tr className="border-b border-slate-200 hover:bg-blue-50/30">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-red-600">
                    {item.rucEmisor}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <span className="line-clamp-1">{item.razonSocial}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">
                    {item.rucCliente}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <span className="line-clamp-1">
                      {item.razonSocialCliente || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                      {tiposComprobante[item.tipoComprobante] ||
                        item.tipoComprobante}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">
                    {item.serie}-{item.numero}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.fecha}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {monedas[item.moneda]?.split("(")[0].trim()} {item.total}
                  </td>
                  <td className="px-4 py-3">
                    {item.preview && (
                      <img
                        src={item.preview}
                        alt="Evidencia"
                        className="h-10 w-10 rounded object-cover border border-slate-200 cursor-pointer hover:border-blue-400"
                        title="Haz clic para ampliar"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleRow(idx)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-slate-200"
                    >
                      {expandedRows[idx] ? (
                        <ChevronUp className="h-4 w-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-600" />
                      )}
                    </button>
                  </td>
                </tr>

                {/* Row expandido - Detalles adicionales */}
                {expandedRows[idx] && (
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td colSpan="11" className="px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            RUC Emisor
                          </p>
                          <p className="text-sm font-mono text-slate-900">
                            {item.rucEmisor}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Razón Social Emisor
                          </p>
                          <p className="text-sm text-slate-900">
                            {item.razonSocial}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            RUC Cliente
                          </p>
                          <p className="text-sm font-mono text-slate-900">
                            {item.rucCliente}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Razón Social Cliente
                          </p>
                          <p className="text-sm text-slate-900">
                            {item.razonSocialCliente || "No disponible"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Tipo de Comprobante
                          </p>
                          <p className="text-sm text-slate-900">
                            {tiposComprobante[item.tipoComprobante] ||
                              item.tipoComprobante}{" "}
                            ({item.tipoComprobante})
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Serie
                          </p>
                          <p className="text-sm font-mono text-slate-900">
                            {item.serie}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Número
                          </p>
                          <p className="text-sm font-mono text-slate-900">
                            {item.numero}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Fecha
                          </p>
                          <p className="text-sm text-slate-900">{item.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Moneda
                          </p>
                          <p className="text-sm text-slate-900">
                            {monedas[item.moneda] || item.moneda}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            IGV
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.igv}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">
                            Total
                          </p>
                          <p className="text-sm font-bold text-green-600">
                            {item.total}
                          </p>
                        </div>
                        {item.preview && (
                          <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase">
                              Evidencia (Imagen)
                            </p>
                            <img
                              src={item.preview}
                              alt="Evidencia"
                              className="h-20 w-full rounded object-cover border border-slate-200 mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-4">
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
