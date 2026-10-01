import { SaveIcon, X, Edit2, Trash2, AlertCircle, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import ImageZoomLightbox from "../ImagZoom/ImageZoomLightbox";
import OcrEditModal from "./OcrEditModal";
import { saveRendicionGasto } from "../../services/save/saveGasto";
import { saveDetalleGasto } from "../../services/save_detalle/saveGastoDetalle";
import { saveEvidenciaGasto } from "../../services/evidencia";
import Toast from "../shared/Toast";
import SaveResultDialog from "../../Messages/SaveResultDialog";
import { getPeruIsoDateTime } from "../../services/fecha";
import AlertaIcon from "@/Icons/AlertaIcon";

// Días transcurridos desde la fecha de la factura hasta hoy (misma lógica que
// la lista de CrearGasto). El comprobante aún no está registrado, así que la
// referencia es la fecha actual.
const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDiasTranscurridos = (fecha) => {
  const fechaFactura = parseDateValue(fecha);
  if (!fechaFactura) return "-";

  const factura = new Date(
    fechaFactura.getFullYear(),
    fechaFactura.getMonth(),
    fechaFactura.getDate(),
  );
  const hoy = new Date();
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diffDays = Math.floor(
    (hoySinHora.getTime() - factura.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diffDays >= 0 ? diffDays : 0;
};

export default function OcrResultsTable({
  resultados: initialResultados,
  onConfirm,
  onCancel,
  // Selección de "Datos Generales" del formulario que abrió el escáner.
  // Sin esto, el guardado masivo inventaba política/categoría.
  datosGenerales = {},
}) {
  const [resultados, setResultados] = useState(initialResultados);
  const [zoomImage, setZoomImage] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);
  const [rucEmpresaActual, setRucEmpresaActual] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastConfig, setToastConfig] = useState({ isVisible: false });
  // Resumen del guardado por lote: facturas guardadas y las que fallaron.
  const [saveResult, setSaveResult] = useState({
    isOpen: false,
    saved: [],
    failed: [],
  });

  const showToast = (message, type = "success") => {
    setToastConfig({ isVisible: true, message, type });
  };

  const handleSaveAllWithAPI = async () => {
    try {
      setIsSaving(true);
      const saved = [];
      const errors = [];

      // Obtener datos del usuario y empresa (igual a GastoGeneral)
      const rawUser = localStorage.getItem("user");
      const empresaStr =
        localStorage.getItem("company") || localStorage.getItem("empresa");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const empresa = empresaStr ? JSON.parse(empresaStr) : {};

      const userId = user?.id ?? user?.usecod ?? user?.iduser;
      const dni = user?.dni ?? user?.DNI ?? "";
      // Hora local de Perú: con toISOString() (UTC) fecEdit quedaba 5 horas
      // adelantado respecto al fecCre que genera SQL Server.
      const nowIso = getPeruIsoDateTime();

      // Datos Generales seleccionados en el formulario. Solo se recurre a los
      // valores genéricos si el formulario no envió nada.
      const politicaSel = String(datosGenerales?.politica || "").trim();
      const categoriaSel = String(datosGenerales?.categoria || "").trim();
      const tipoGastoSel = String(datosGenerales?.tipoGasto || "").trim();
      const idCuentaSel = String(datosGenerales?.idCuenta || "").trim();
      const consumidorSel = String(datosGenerales?.consumidor || "").trim();
      const motivoViajeSel = String(datosGenerales?.motivoViaje || "").trim();
      const origenSel = String(datosGenerales?.origen || "").trim();
      const destinoSel = String(datosGenerales?.destino || "").trim();
      const tipoMovilidadSel = String(
        datosGenerales?.tipoMovilidad || "",
      ).trim();
      const placaSel = String(datosGenerales?.placa || "").trim();
      const glosaSel = String(datosGenerales?.glosa || "").trim();

      for (const resultado of resultados) {
        // Facturas cuyo RUC Cliente no coincide con la empresa logueada no se
        // guardan: se reportan en el resumen igual que un error, sin llamar
        // a ninguno de los 3 servicios de guardado.
        if (!validarRucFacura(resultado.rucCliente).valido) {
          const refRucInvalido =
            [resultado.serie, resultado.numero].filter(Boolean).join("-") ||
            resultado.razonSocial ||
            "Factura sin identificar";
          errors.push({
            ref: refRucInvalido,
            msg: "No se guardó: la factura no pertenece a la empresa logueada (el RUC del cliente no coincide).",
            esRucInvalido: true,
          });
          continue;
        }

        try {
          // Glosa por factura: la que se editó en el modal (resultado.glosa)
          // tiene prioridad; si no, la del formulario principal (glosaSel).
          const glosaFactura = String(resultado.glosa || glosaSel || "").trim();

          // 1️⃣ GUARDAR CABECERA (igual a GastoGeneral)
          const payloadCabecera = {
            idUser: Number(userId) || 0,
            dni: dni,
            politica: politicaSel || "GASTO GENERAL",
            categoria: categoriaSel || "OTROS",
            tipogasto: tipoGastoSel,
            tipoGastoCentroCosto: tipoGastoSel,
            idCuenta: idCuentaSel,
            consumidor: consumidorSel,
            ruc: String(resultado.rucEmisor || ""),
            rucCliente: String(resultado.rucCliente || ""),
            desEmp: String(empresa?.nombre || empresa?.empresa || ""),
            desSed: "",
            gerencia: String(empresa?.gerencia || ""),
            area: String(empresa?.area || ""),
            proveedor: String(resultado.razonSocial || ""),
            tipoCombrobante:
              resultado.tipoComprobante === "01"
                ? "FACTURA ELECTRONICA"
                : resultado.tipoComprobante === "03"
                  ? "BOLETA"
                  : resultado.tipoComprobante === "07"
                    ? "NOTA DE CRÉDITO"
                    : resultado.tipoComprobante === "08"
                      ? "NOTA DE DÉBITO"
                      : "OTROS",
            serie: String(resultado.serie || ""),
            numero: String(resultado.numero || ""),
            fecha: String(resultado.fecha || ""),
            igv: Number(resultado.igv) || 0,
            total: Number(resultado.total) || 0,
            moneda:
              resultado.moneda === "01"
                ? "PEN"
                : resultado.moneda === "03"
                  ? "USD"
                  : "",
            estadoActual: "BORRADOR",
            // La glosa del usuario va en la columna "glosa" (igual que
            // Movilidad/GastoGeneral) y también en "obs".
            glosa: "CREAR GASTO",
            motivoViaje: motivoViajeSel,
            lugarOrigen: origenSel,
            lugarDestino: destinoSel,
            tipoMovilidad: tipoMovilidadSel,
            placa: placaSel,
            placaVehiculo: placaSel,
            obs: glosaFactura,
            estado: "S",
            fecCre: nowIso,
            useReg: Number(userId) || 0,
            hostname: "WEB",
            fecEdit: nowIso,
            useEdit: 0,
            useElim: 0,
          };

          const { idRend: responseCabecera, mensaje: mensajeSP } =
            await saveRendicionGasto(payloadCabecera);

          if (!responseCabecera) {
            throw new Error(mensajeSP || "Error al guardar cabecera");
          }

          // 2️⃣ GUARDAR DETALLE (igual a GastoGeneral)
          const payloadDetalle = {
            ...payloadCabecera,
            idRend: String(responseCabecera),
            idrend: String(responseCabecera),
            fecEdit: nowIso,
            useEdit: Number(userId) || 0,
            idcuenta: idCuentaSel,
            consumidor: consumidorSel,
            /*  glosa: glosaFactura || "CREAR GASTO", */
            obs: glosaFactura,
          };

          await saveDetalleGasto(payloadDetalle);

          // 3️⃣ GUARDAR EVIDENCIA (igual a GastoGeneral)
          if (resultado.preview) {
            try {
              // Convertir data URL a File
              const dataUrl = resultado.preview;
              const arr = dataUrl.split(",");
              const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
              const bstr = atob(arr[1]);
              const n = bstr.length;
              const u8arr = new Uint8Array(n);
              for (let i = 0; i < n; i++) {
                u8arr[i] = bstr.charCodeAt(i);
              }
              const evidenciaFile = new File([u8arr], "factura.png", {
                type: mime,
              });

              const evidenciaResult = await saveEvidenciaGasto({
                idRend: responseCabecera,
                file: evidenciaFile,
                gastoData: {
                  ruc: String(resultado.rucEmisor || ""),
                  serie: String(resultado.serie || ""),
                  numero: String(resultado.numero || ""),
                },
              });

              const evidenciaPath = String(evidenciaResult?.path || "").trim();

              if (evidenciaPath) {
                const payloadDetalleEvidencia = {
                  ...payloadDetalle,
                  idRend: String(responseCabecera),
                  idrend: String(responseCabecera),
                  path: evidenciaPath,
                  ruta: evidenciaPath,
                  rutaArchivo: evidenciaPath,
                  pathArchivo: evidenciaPath,
                  evidenciaPath,
                  nombreArchivo: String(
                    evidenciaResult?.fileName || "factura.png",
                  ),
                  nomArchivo: String(
                    evidenciaResult?.fileName || "factura.png",
                  ),
                  ig: Number(resultado.igv) || 0,
                  fecEdit: nowIso,
                  useEdit: Number(userId) || 0,
                };

                await saveDetalleGasto(payloadDetalleEvidencia);
              }
            } catch (evidenciaError) {
              console.warn(
                "⚠️ No se pudo persistir evidencia:",
                evidenciaError?.message,
              );
            }
          }

          // Guardar la referencia de la factura para mostrarla en el resumen.
          saved.push({
            ref:
              [resultado.serie, resultado.numero].filter(Boolean).join("-") ||
              resultado.razonSocial ||
              "Factura",
            proveedor: resultado.razonSocial || "",
            total: resultado.total || "0.00",
            moneda: resultado.moneda === "03" ? "USD" : "PEN",
            idRend: responseCabecera,
          });
        } catch (err) {
          // Guardar la referencia de la factura (serie-número/proveedor) junto
          // al motivo, para poder decirle al usuario CUÁL falló y por qué.
          const ref =
            [resultado.serie, resultado.numero].filter(Boolean).join("-") ||
            resultado.razonSocial ||
            "Factura sin identificar";
          const msg = String(err.message || "Error desconocido").trim();
          errors.push({
            ref,
            msg,
            esDuplicado: /YA EXISTE|DUPLICAD|ALREADY/i.test(msg),
          });
        }
      }

      // Si se guardó al menos una factura, refrescar la lista de gastos.
      if (saved.length > 0) {
        window.dispatchEvent(new CustomEvent("gasto:updated"));
      }

      // Siempre se muestra el resumen: qué facturas se guardaron y cuáles
      // fallaron (con el motivo del SP). Al cerrarlo se termina el flujo.
      setSaveResult({ isOpen: true, saved, failed: errors });
    } catch (err) {
      showToast("Error al guardar: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

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

  // Anchos de columnas del desktop. EMPRESA (emisor) se deja sin ancho fijo a
  // propósito: absorbe el sobrante y evita que el redondeo de porcentajes
  // sume de más y aparezca barra de scroll horizontal. Las demás suman ~75%.
  const desktopColumnWidths = {
    numero: "2%",
    comprobante: "12%",
    fecha: "10%",
    dias: "6%",
    total: "9%",
    igv: "8%",
    moneda: "7%",
    evidencia: "8%",
    acciones: "9%",
    observaciones: "12%",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Resultados del Scanit:
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500">
          <AlertaIcon className="h-5 w-5 shrink-0 text-red-700" />
          <span>Revisa antes de guardar</span>
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
              {/* 
              <th
                style={{ width: desktopColumnWidths.rucCliente }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                RUC EMISOR
              </th>
 */}
              <th
                style={{ width: desktopColumnWidths.emisor }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 "
              >
                EMPRESA
              </th>

              <th
                style={{ width: desktopColumnWidths.comprobante }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                SERIE-NÚMERO
              </th>

              <th
                style={{ width: desktopColumnWidths.fecha }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Fecha
              </th>

              <th
                style={{ width: desktopColumnWidths.dias }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Días
              </th>

              <th
                style={{ width: desktopColumnWidths.total }}
                className="border-b border-slate-200 px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Total
              </th>
              <th
                style={{ width: desktopColumnWidths.igv }}
                className="border-b border-slate-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                IGV
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
                style={{ width: desktopColumnWidths.observaciones }}
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
                {/*  <td
                  style={{ width: desktopColumnWidths.rucEmisor }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {item.rucEmisor || "—"}
                  </span>
                </td>
 */}
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

                {/* COMPROBANTE */}
                <td
                  style={{ width: desktopColumnWidths.comprobante }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <div className="text-xs font-semibold text-black-400">
                    {item.serie || "—"}-{item.numero || "—"}
                  </div>
                </td>

                {/* FECHA */}
                <td
                  style={{ width: desktopColumnWidths.fecha }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="text-xs font-semibold text-black-400">
                    {item.fecha || "—"}
                  </span>
                </td>

                {/* DÍAS */}
                <td
                  style={{ width: desktopColumnWidths.dias }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    {getDiasTranscurridos(item.fecha)}
                  </span>
                </td>

                {/* TOTAL */}
                <td
                  style={{ width: desktopColumnWidths.total }}
                  className="border-b border-slate-100 px-2 py-2.5 text-right"
                >
                  <span className="text-xs font-semibold text-black-400">
                    {item.total || "0.00"}
                  </span>
                </td>

                {/* IGV */}
                <td
                  style={{ width: desktopColumnWidths.igv }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="text-xs font-semibold text-black-400 ">
                    {item.igv}
                  </span>
                </td>

                {/* MONEDA */}
                <td
                  style={{ width: desktopColumnWidths.moneda }}
                  className="border-b border-slate-100 px-2 py-2.5 text-center"
                >
                  <span className="text-xs font-semibold text-black-400">
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
                  relative
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
                      {/* Ojo superpuesto en hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/evidence:opacity-100 transition-opacity duration-200">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
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
                    {/* VER */}
                    {item.preview && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="
                    inline-flex h-8 w-8
                    items-center justify-center
                    rounded-lg
                    border border-cyan-200
                    bg-cyan-50
                    text-cyan-600
                    transition-all
                    hover:border-cyan-300
                    hover:bg-cyan-100
                    hover:text-cyan-700
                    hover:shadow-sm
                    active:scale-95
                    cursor-pointer
                  "
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}

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

      {/* Mobile/Tablet Card View — mismo estilo compacto de chips que CrearGasto */}
      <div className="lg:hidden grid gap-2.5 sm:grid-cols-2">
        {resultados.map((item, idx) => {
          const validacion = validarRucFacura(item.rucCliente);
          const esValido = validacion.color.includes("green");
          const esInvalido = validacion.color.includes("red");
          return (
            <article
              key={idx}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="px-2.5 py-2 sm:px-3">
                <div className="flex items-start gap-2.5">
                  {/* Miniatura de la evidencia */}
                  {item.preview ? (
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200"
                      title="Ver evidencia"
                    >
                      <img
                        src={item.preview}
                        alt="Evidencia"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[9px] font-medium text-slate-400">
                      Sin img
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-900"
                          title={item.razonSocial}
                        >
                          {item.razonSocial || "Sin nombre"}
                        </p>
                        <p
                          className="mt-0.5 truncate font-mono text-[10px] font-semibold text-slate-500"
                          title={item.rucEmisor}
                        >
                          RUC {item.rucEmisor || "—"}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(idx)}
                          title="Editar"
                          aria-label="Editar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmIndex(idx)}
                          title="Eliminar"
                          aria-label="Eliminar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Chips */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {/* <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {item.serie || "—"}-{item.numero || "—"}
                      </span> */}
                      {/*  <span className="inline-flex rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        {tiposComprobante[item.tipoComprobante]?.split(
                          " ",
                        )[0] || "—"}
                      </span> */}
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {item.fecha || "—"}
                      </span>
                      <span className="inline-flex rounded-full border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        {getDiasTranscurridos(item.fecha)} días
                      </span>
                      <span className="inline-flex rounded-full border border-blue-400 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                        {item.total || "0.00"} {monedas[item.moneda] || "PEN"}
                      </span>

                      {/* Estado de validación del RUC */}
                      <span
                        title={validacion.mensaje}
                        className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          esValido
                            ? "bg-green-100 text-green-700"
                            : esInvalido
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {esValido
                          ? "✓ Empresa"
                          : esInvalido
                            ? "✗ No coincide"
                            : "RUC N/D"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de Zoom usando componente existente */}
      <ImageZoomLightbox src={zoomImage} onClose={() => setZoomImage(null)} />

      {/* Modal Preview (mismo diseño que la vista previa de CrearGasto) */}
      {previewItem &&
        (() => {
          const validacion = validarRucFacura(previewItem.rucCliente);
          const esValido = validacion.color.includes("green");
          const esInvalido = validacion.color.includes("red");
          return (
            <>
              <button
                type="button"
                aria-label="Cerrar modal"
                className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]"
                onClick={() => setPreviewItem(null)}
              />

              <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto p-4">
                <div className="flex w-full max-w-2xl flex-col overflow-hidden bg-transparent shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] backdrop-blur-sm max-h-[88vh] rounded-2xl p-0 sm:rounded-[1.35rem]">
                  <div className="min-h-0 flex-1 overflow-y-auto bg-linear-to-b from-white to-slate-50/70">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      {/* Header */}
                      <div className="relative flex flex-col gap-2 border-b border-slate-200 bg-linear-to-r from-cyan-50 to-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                        <div className="min-w-0">
                          <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-800 sm:text-[15px]">
                            Vista previa:
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:text-xs">
                              {previewItem.serie || "—"}-
                              {previewItem.numero || "—"}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                esValido
                                  ? "bg-green-100 text-green-700"
                                  : esInvalido
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {esValido
                                ? "✓ Empresa"
                                : esInvalido
                                  ? "✗ No coincide"
                                  : "RUC N/D"}
                            </span>
                          </h3>
                          <X
                            className="absolute right-3 top-3 h-6 w-6 cursor-pointer rounded-full p-1 text-slate-400 transition-all duration-200 hover:scale-110 hover:bg-red-100 hover:text-red-600 sm:right-4 sm:top-4"
                            onClick={() => setPreviewItem(null)}
                          />
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
                        {/* Evidencia */}
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Evidencia
                          </p>
                          {previewItem.preview ? (
                            <img
                              src={previewItem.preview}
                              alt="Evidencia del gasto"
                              className="w-full cursor-zoom-in rounded-xl border border-slate-200 object-contain shadow-sm transition hover:opacity-90"
                              style={{ maxHeight: "220px" }}
                              onClick={() => setZoomImage(previewItem.preview)}
                            />
                          ) : (
                            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                              <p className="text-xs text-slate-400">
                                Sin evidencia adjunta
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Emisor y Cliente */}
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Datos Generales del Gasto:
                          </h2>
                          {[
                            ["RUC Emisor:", previewItem.rucEmisor || "-"],
                            ["Razón Social:", previewItem.razonSocial || "-"],
                            ["RUC Cliente:", previewItem.rucCliente || "-"],
                            [
                              "Razón Social Cliente:",
                              previewItem.razonSocialCliente || "-",
                            ],
                          ].map(([label, value]) => (
                            <div key={label} className="col-span-1">
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 font-medium text-slate-700">
                                {value ?? "-"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        {/* Monto */}
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Monto del Gasto:
                          </h2>
                          {[
                            ["Total:", previewItem.total || "0.00"],
                            ["IGV:", previewItem.igv || "0.00"],
                            ["Moneda:", monedas[previewItem.moneda] || "PEN"],
                          ].map(([label, value]) => (
                            <div key={label} className="col-span-1">
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 font-medium text-slate-700">
                                {value ?? "-"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        {/* Factura */}
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Datos de la Factura:
                          </h2>
                          {[
                            [
                              "Tipo Comprobante:",
                              tiposComprobante[previewItem.tipoComprobante] ||
                                previewItem.tipoComprobante ||
                                "-",
                            ],
                            ["Fecha Emisión:", previewItem.fecha || "-"],
                            [
                              "Serie - Número:",
                              `${previewItem.serie || "-"} - ${previewItem.numero || "-"}`,
                            ],
                          ].map(([label, value]) => (
                            <div key={label} className="col-span-1">
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {label}
                              </dt>
                              <dd className="mt-0.5 font-medium text-slate-700">
                                {value ?? "-"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        {/* Validación */}
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">
                            Validación:
                          </h2>
                          <div className="col-span-2">
                            <dd
                              className={`rounded-lg p-2 text-center text-xs font-semibold ${
                                esValido
                                  ? "bg-green-50 text-green-700"
                                  : esInvalido
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-50 text-slate-500"
                              }`}
                            >
                              {validacion.mensaje}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

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
      <div className="flex flex-row gap-2 pt-4 border-t border-slate-200 sm:gap-3">
        <button
          onClick={onCancel}
          className="
      flex-1
      inline-flex
      items-center
      justify-center
      gap-1.5
      rounded-lg
      border-2
      border-rose-200
      bg-rose-50
      px-3
      py-2.5
      text-sm
      font-semibold
      text-rose-600
      transition-all
      hover:border-rose-300
      hover:bg-rose-100
      hover:text-rose-700
      active:scale-[0.98]
      cursor-pointer
      sm:gap-2
      sm:px-4
      sm:py-3
    "
        >
          <X className="h-4 w-4 shrink-0" />
          <span>Cancelar</span>
        </button>

        <button
          onClick={handleSaveAllWithAPI}
          disabled={resultados.length === 0 || isSaving}
          className="
    flex-1
    inline-flex
    items-center
    justify-center
    gap-1.5
    rounded-lg
    bg-gradient-to-r
    from-green-500
    to-emerald-600
    px-3
    py-2.5
    text-sm
    font-semibold
    text-white
    shadow-md
    transition-all
    hover:from-green-600
    hover:to-emerald-700
    active:scale-[0.98]
    cursor-pointer
    disabled:cursor-not-allowed
    disabled:opacity-50
    sm:gap-2
    sm:px-4
    sm:py-3
  "
        >
          <SaveIcon className="h-4 w-4 shrink-0" />

          <span className="truncate">
            {isSaving ? "Guardando..." : "Guardar"}
          </span>
        </button>
      </div>
      <Toast
        message={toastConfig.message}
        type={toastConfig.type}
        isVisible={Boolean(toastConfig.isVisible && toastConfig.message)}
        onClose={() => setToastConfig({ isVisible: false })}
        duration={5000}
      />

      <SaveResultDialog
        isOpen={saveResult.isOpen}
        saved={saveResult.saved}
        failed={saveResult.failed}
        onClose={() => {
          setSaveResult({ ...saveResult, isOpen: false });
          // "Entendido" cierra todo el flujo del escáner.
          onConfirm(resultados);
        }}
      />
    </div>
  );
}
