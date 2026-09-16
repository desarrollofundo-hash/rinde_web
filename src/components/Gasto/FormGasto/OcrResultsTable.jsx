import {
  Check,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  ArrowBigRight,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
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
  const [rucEmpresaActual, setRucEmpresaActual] = useState("");

  // Actualizar RUC de empresa cada vez que cambia el usuario/empresa logueada
  useEffect(() => {
    const obtenerRucActual = () => {
      try {
        const rawEmpresa =
          localStorage.getItem("company") || localStorage.getItem("empresa");
        const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
        const ruc = String(
          empresa?.ruc ?? empresa?.RUC ?? empresa?.numRuc ?? "",
        ).replace(/\D/g, "");
        setRucEmpresaActual(ruc);
        console.log("✓ RUC de empresa actualizado:", ruc);
      } catch (error) {
        console.error("Error al obtener RUC de empresa:", error);
        setRucEmpresaActual("");
      }
    };

    obtenerRucActual();

    // Escuchar cambios en localStorage cada 500ms para detectar cambio de empresa
    const interval = setInterval(obtenerRucActual, 500);
    return () => clearInterval(interval);
  }, []);

  const tiposComprobante = {
    "01": "FACTURA ELECTRONICA",
    "03": "BOLETA DE VENTA",
    "07": "NOTA DE CREDITO",
    "08": "NOTA DE DEBITO",
    10: "RECIBO POR HONORARIO",
    11: "OTROS",
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

  const validarRucFacura = (rucCliente) => {
    const rucClienteLimpio = String(rucCliente || "").replace(/\D/g, "");

    if (!rucClienteLimpio || !rucEmpresaActual) {
      return {
        valido: false,
        mensaje: "RUC no disponible",
        color: "text-gray-500",
      };
    }

    if (rucClienteLimpio === rucEmpresaActual) {
      return {
        valido: true,
        mensaje: "✓ Factura sí pertenece a la empresa",
        color: "text-green-600 font-semibold",
      };
    } else {
      return {
        valido: false,
        mensaje: "✗ Factura NO pertenece a la empresa",
        color: "text-red-600 font-semibold",
      };
    }
  };

  const desktopColumnWidths = {
    numero: "4%",
    rucCliente: "10%",
    cliente: "20%",
    tipo: "8%",
    comprobante: "13%",
    fecha: "10%",
    total: "9%",
    moneda: "7%",
    evidencia: "10%",
    acciones: "11%",
    observaciones: "10%",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <ArrowBigRight className="h-5 w-5 text-blue-500 " />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Resultados del Scanit:
            </h3>
            {/*     <p className="text-xs text-slate-500">
              {resultados.length} {resultados.length === 1 ? "registro" : "registros"}
            </p> */}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-blue-500 " />
          Revisa antes de guardar
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          {/* ================= HEADER ================= */}
          <thead>
            <tr className="bg-slate-50">
              <th
                style={{ width: desktopColumnWidths.numero }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                #
              </th>

              <th
                style={{ width: desktopColumnWidths.rucCliente }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                RUC EMISOR
              </th>

              <th
                style={{ width: desktopColumnWidths.emisor }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 "
              >
                EMPRESA
              </th>

              <th
                style={{ width: desktopColumnWidths.tipo }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Tipo
              </th>

              <th
                style={{ width: desktopColumnWidths.comprobante }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Comprobante
              </th>

              <th
                style={{ width: desktopColumnWidths.fecha }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Fecha
              </th>

              <th
                style={{ width: desktopColumnWidths.total }}
                className="border-b border-slate-200 px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Total
              </th>

              <th
                style={{ width: desktopColumnWidths.moneda }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Moneda
              </th>

              <th
                style={{ width: desktopColumnWidths.evidencia }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Evidencia
              </th>

              <th
                style={{ width: desktopColumnWidths.acciones }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Acciones
              </th>
              <th
                style={{ width: desktopColumnWidths.acciones }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Observaciones
              </th>
            </tr>
          </thead>

          {/* ================= BODY ================= */}
          <tbody>
            {resultados.map((item, idx) => (
              <tr
                key={idx}
                className={`
            group transition-colors
            hover:bg-blue-50/40
            ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}
          `}
              >
                {/* # */}
                <td
                  style={{ width: desktopColumnWidths.numero }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="text-xs font-semibold text-slate-400">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </td>

                {/* RUC EMISOR */}
                <td
                  style={{ width: desktopColumnWidths.rucEmisor }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {item.rucEmisor || "—"}
                  </span>
                </td>

                {/* CLIENTE */}
                <td
                  style={{ width: desktopColumnWidths.emisor }}
                  className="border-b border-slate-100 px-2 py-2.5"
                >
                  <div
                    className="truncate text-center text-xs font-semibold text-slate-800"
                    title={item.emisor || ""}
                  >
                    {item.razonSocial || "—"}
                  </div>
                </td>

                {/* TIPO */}
                <td
                  style={{ width: desktopColumnWidths.tipo }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                    {tiposComprobante[item.tipoComprobante]?.split(" ")[0] ||
                      item.tipoComprobante ||
                      "—"}
                  </span>
                </td>

                {/* COMPROBANTE */}
                <td
                  style={{ width: desktopColumnWidths.comprobante }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <div className="font-mono text-xs font-semibold text-slate-700">
                    {item.serie || "—"}-{item.numero || "—"}
                  </div>
                </td>

                {/* FECHA */}
                <td
                  style={{ width: desktopColumnWidths.fecha }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="text-xs font-medium text-slate-600">
                    {item.fecha || "—"}
                  </span>
                </td>

                {/* TOTAL */}
                <td
                  style={{ width: desktopColumnWidths.total }}
                  className="border-b border-slate-100 px-2 py-2.5 text-right"
                >
                  <span className="text-sm font-bold text-slate-800">
                    {item.total || "0.00"}
                  </span>
                </td>

                {/* MONEDA */}
                <td
                  style={{ width: desktopColumnWidths.moneda }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="inline-flex min-w-[42px] items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {monedas[item.moneda] || "PEN"}
                  </span>
                </td>

                {/* EVIDENCIA */}
                <td
                  style={{ width: desktopColumnWidths.evidencia }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  {item.preview ? (
                    <button
                      type="button"
                      onClick={() => setZoomImage(item.preview)}
                      className="
                  group/evidence
                  inline-flex h-11 w-11
                  items-center justify-center
                  overflow-hidden
                  rounded-lg
                  border border-slate-200
                  bg-white
                  shadow-sm
                  transition-all
                  hover:border-blue-400
                  hover:shadow-md
                  cursor-pointer
                "
                      title="Ver evidencia"
                    >
                      <img
                        src={item.preview}
                        alt="Evidencia"
                        className="
                    h-full w-full
                    object-cover
                    transition-transform
                    duration-200
                    group-hover/evidence:scale-110
                  "
                      />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Sin imagen</span>
                  )}
                </td>

                {/* ACCIONES */}
                <td
                  style={{ width: desktopColumnWidths.acciones }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {/* EDITAR */}
                    <button
                      type="button"
                      onClick={() => handleEdit(idx)}
                      className="
                  inline-flex h-8 w-8
                  items-center justify-center
                  rounded-lg
                  border border-blue-200
                  bg-blue-50
                  text-blue-600
                  transition-all
                  hover:border-blue-300
                  hover:bg-blue-100
                  hover:text-blue-700
                  hover:shadow-sm
                  active:scale-95
                  cursor-pointer
                "
                      title="Editar gasto"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* ELIMINAR */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmIndex(idx)}
                      className="
                  inline-flex h-8 w-8
                  items-center justify-center
                  rounded-lg
                  border border-red-200
                  bg-red-50
                  text-red-500
                  transition-all
                  hover:border-red-300
                  hover:bg-red-100
                  hover:text-red-600
                  hover:shadow-sm
                  active:scale-95
                  cursor-pointer
                "
                      title="Quitar gasto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>

                {/*OBSERVACIONES */}
                <td
                  style={{ width: desktopColumnWidths.observaciones }}
                  className="border-b border-slate-100 px-2 py-2.5"
                >
                  <div
                    className={`text-center text-xs ${validarRucFacura(item.rucCliente).color}`}
                  >
                    {validarRucFacura(item.rucCliente).mensaje}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden grid gap-3 sm:grid-cols-2">
        {resultados.map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Registro #{idx + 1}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.razonSocial || "Sin nombre"}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {item.serie}-{item.numero}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {/* RUC y Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">
                    RUC
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-700">
                    {item.rucEmisor || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">
                    Tipo
                  </p>
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                    {tiposComprobante[item.tipoComprobante]?.split(" ")[0] ||
                      "—"}
                  </span>
                </div>
              </div>

              {/* Fecha y Moneda */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">
                    Fecha
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {item.fecha || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">
                    Moneda
                  </p>
                  <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {monedas[item.moneda] || "PEN"}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-600 font-semibold mb-1">
                  Total
                </p>
                <p className="text-lg font-bold text-green-700">
                  S/ {item.total || "0.00"}
                </p>
              </div>

              {/* Evidencia */}
              {item.preview && (
                <button
                  type="button"
                  onClick={() => setZoomImage(item.preview)}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden hover:border-blue-400 transition-colors group"
                  title="Click para ampliar"
                >
                  <img
                    src={item.preview}
                    alt="Evidencia"
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                  />
                </button>
              )}

              {/* Observación */}
              <div
                className={`rounded-lg p-3 text-center text-sm font-semibold border-2 ${
                  validarRucFacura(item.rucCliente).color.includes("green")
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {validarRucFacura(item.rucCliente).mensaje}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleEdit(idx)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 py-2 font-semibold transition hover:bg-blue-100 active:scale-95 cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmIndex(idx)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-500 py-2 font-semibold transition hover:bg-red-100 active:scale-95 cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        ))}
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
                  <strong>Emisor:</strong>{" "}
                  {resultados[deleteConfirmIndex]?.razonSocial}
                </p>
                <p className="text-sm">
                  <strong>Comprobante:</strong>{" "}
                  {resultados[deleteConfirmIndex]?.serie}-
                  {resultados[deleteConfirmIndex]?.numero}
                </p>
                <p className="text-sm">
                  <strong>Total:</strong>{" "}
                  {resultados[deleteConfirmIndex]?.total}
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
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
        <button
          onClick={() => onConfirm(resultados)}
          disabled={resultados.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 font-semibold text-white transition hover:from-green-600 hover:to-emerald-700 active:scale-95 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-4 w-4" />
          <span>
            Guardar {resultados.length > 0 && `(${resultados.length})`}
          </span>
        </button>
      </div>
    </div>
  );
}
