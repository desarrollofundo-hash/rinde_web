import { useEffect, useMemo, useState } from "react";
import { getListaGastos } from "../../services/listar/listar_gasto";

export default function ModalInforme({
    isOpen,
    onClose,
    onSave,
    /* onPreview, */
    selectedIniciales = [],
    titulo,
    politica,
    glosa,
    idInf,
}) {
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedGastos, setSelectedGastos] = useState([]);

    const getGastoId = (gasto) => String(gasto?.idrend ?? gasto?.idRend ?? gasto?.id ?? "");

    const getGastoEstadoActual = (gasto) =>
        String(
            gasto?.estadoActual ??
            gasto?.estadoactual ??
            gasto?.EstadoActual ??
            gasto?.estado ??
            ""
        )
            .trim()
            .toUpperCase();

    const parseAmount = (value) => {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value !== "string") {
            return 0;
        }

        const raw = value.trim().replace(/[^\d,.-]/g, "");
        if (!raw) return 0;

        let normalized = raw;
        const hasComma = raw.includes(",");
        const hasDot = raw.includes(".");

        if (hasComma && hasDot) {
            if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
                normalized = raw.replace(/\./g, "").replace(",", ".");
            } else {
                normalized = raw.replace(/,/g, "");
            }
        } else if (hasComma) {
            normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getGastoAmount = (gasto) =>
        parseAmount(
            gasto?.total ??
            gasto?.monto ??
            gasto?.importe ??
            gasto?.amount ??
            gasto?.valor ??
            gasto?.subtotal ??
            gasto?.montoTotal ??
            gasto?.montototal ??
            gasto?.proveedor ??
            gasto?.importeTotal ??
            gasto?.totalComprobante ??
            0
        );

    const totalSeleccionado = useMemo(() => {
        if (!Array.isArray(gastos) || gastos.length === 0 || selectedGastos.length === 0) {
            return 0;
        }

        const selectedSet = new Set(selectedGastos.map((id) => String(id)));
        return gastos.reduce((acc, gasto) => {
            const id = getGastoId(gasto);
            if (!selectedSet.has(id)) return acc;
            return acc + getGastoAmount(gasto);
        }, 0);
    }, [gastos, selectedGastos]);

    useEffect(() => {
        if (isOpen && idInf) {
            cargarGastos();
        }
    }, [isOpen, idInf]);

    useEffect(() => {
        // 🧹 Si selectedIniciales es vacío, resetear selectedGastos
        // (esto pasa cuando creas un NUEVO informe, no uno existente)
        if (isOpen && Array.isArray(selectedIniciales) && selectedIniciales.length === 0) {
/*             console.log("🧹 Reseteando selectedGastos (nuevo informe sin detalles previos)");
 */            setSelectedGastos([]);
        }
    }, [isOpen, selectedIniciales]);

    const cargarGastos = async () => {
        try {
            setLoading(true);
            setError("");

            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");

            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            if (!userData || !companyData) {
                throw new Error("No hay sesión activa");
            }

            const gastosData = await getListaGastos({
                id: "1",
                idrend: "1",
                user: String(userData.usecod ?? userData.id),
                ruc: String(companyData.ruc),
            });

            const usedSet = new Set();

            // 🔥 Filtrar gastos por política seleccionada y estado BORRADOR
            const gastosFiltrados = Array.isArray(gastosData)
                ? gastosData.filter((g) => {
                    const gastoId = getGastoId(g);
                    const estadoActual = getGastoEstadoActual(g);
                    return (
                        String(g.politica).toLowerCase() === String(politica).toLowerCase() &&
                        estadoActual === "BORRADOR" &&
                        !usedSet.has(String(gastoId))
                    );
                })
                : [];

            setGastos(gastosFiltrados);
            const inicialesValidos = (Array.isArray(selectedIniciales) ? selectedIniciales : [])
                .map(id => String(id))
                .filter((id) => gastosFiltrados.some((g) => getGastoId(g) === id));
            /* console.log("📌 Iniciales normalizadas en ModalInforme:", inicialesValidos); */
            setSelectedGastos(inicialesValidos);
        } catch (err) {
            /* console.error("Error cargando gastos:", err); */
            setError("No se pudieron cargar los gastos");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleGasto = (gastoId) => {
        const normalizedId = String(gastoId);
        if (!normalizedId) return;

        setSelectedGastos((prev) =>
            prev.includes(normalizedId)
                ? prev.filter((id) => id !== normalizedId)
                : [...prev, normalizedId]
        );
        setError("");
    };

    const handleGuardar = () => {
       /*  console.log("🔵 handleGuardar ejecutado");
        console.log("📊 Gastos disponibles:", gastos.length);
        console.log("✅ Gastos seleccionados:", selectedGastos);
        console.log("📝 IDs seleccionados:", JSON.stringify(selectedGastos)); */

        if (selectedGastos.length === 0) {
            setError("Selecciona al menos un gasto para asociar al informe");
            /* console.warn("⚠️ No hay gastos seleccionados"); */
            return;
        }

        const payload = {
            idInf,
            titulo,
            politica,
            glosa,
            gastosSeleccionados: selectedGastos,
        };

/*         console.log("📦 Payload a enviar:", JSON.stringify(payload, null, 2));
 */        onSave(payload);
    };

    /* const handleVistaPrevia = () => {
        if (selectedGastos.length === 0) {
            setError("Selecciona al menos un gasto para ver vista previa");
            return;
        }

        onPreview({
            idInf,
            titulo,
            politica,
            glosa,
            gastosSeleccionados: selectedGastos,
            gastosPolitica: gastos,
        });
    };

    if (!isOpen) return null; */

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 to-cyan-50 px-6 py-4">
                    <h2 className="text-xl font-bold text-slate-800">Asociar Gastos al Informe</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Selecciona los gastos de la política <strong>{politica}</strong>
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Error */}
                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Resumen Informe */}
                    <div className="rounded-lg bg-slate-100 p-4 space-y-2">
                        <p className="text-sm text-slate-700">
                            <strong>Título:</strong> {titulo}
                        </p>
                        <p className="text-sm text-slate-700">
                            <strong>Política:</strong> {politica}
                        </p>
                        <p className="text-sm text-slate-700">
                            <strong>Gastos seleccionados:</strong> {selectedGastos.length}
                        </p>
                        <p className="text-sm text-slate-700">
                            <strong>Monto total seleccionado:</strong> S/ {totalSeleccionado.toFixed(2)}
                        </p>
                        {glosa && (
                            <p className="text-sm text-slate-700">
                                <strong>Nota:</strong> {glosa}
                            </p>
                        )}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-slate-600">Cargando gastos...</p>
                        </div>
                    )}

                    {/* Tabla de gastos */}
                    {!loading && gastos.length === 0 && (
                        <div className="rounded-lg bg-slate-100 px-4 py-6 text-center">
                            <p className="text-slate-600">No hay gastos disponibles para esta política</p>
                        </div>
                    )}

                    {!loading && gastos.length > 0 && (
                        <div className="rounded-lg border border-slate-300 overflow-hidden">
                            <table className="w-full text-sm ">
                                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedGastos.length === gastos.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedGastos(
                                                            gastos
                                                                .map((g) => getGastoId(g))
                                                                .filter((id) => id !== null && id !== undefined)
                                                        );
                                                    } else {
                                                        setSelectedGastos([]);
                                                    }
                                                }}
                                                className="cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">#</th>

                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                            Categoría
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                            Fecha
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gastos.map((gasto, index) => (
                                        <tr
                                            key={getGastoId(gasto) ?? index}
                                            className="border-b border-slate-200 hover:bg-slate-50 text-center"
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGastos.includes(getGastoId(gasto))}
                                                    onChange={() =>
                                                        handleToggleGasto(getGastoId(gasto))
                                                    }
                                                    className="cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{gasto.idrend}</td>

                                            <td className="px-4 py-3 text-slate-700 text-center">
                                                {gasto.categoria || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 font-semibold">
                                                {getGastoAmount(gasto).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {gasto.fecha?.split("T")[0] || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleGuardar}
                        disabled={loading || selectedGastos.length === 0}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
                    >
                        {selectedGastos.length === 0
                            ? "Selecciona gastos"
                            : `Crear Informe (${selectedGastos.length})`}
                    </button>

                </div>
            </div>
        </div>
    );
}
