import { useState, useEffect } from "react";
import { getDropdownOptionsPolitica } from "../../services/politica";
import GastoGeneral from "./FormGasto/GastoGeneral";
import GastoMovilidad from "./FormGasto/GastoMovilidad";
import TarjetaCredito from "./FormGasto/TarjetaCredito";
import { getListaGastos } from "../../services/listar/listar_gasto";

export default function CrearGasto() {
    //ESTADOS DE POLITICAS
    const [politicas, setPoliticas] = useState([]);
    //ESTADOS PARA MOSTRAR EL MODAL DE CREACION DE GASTO
    const [showModal, setShowModal] = useState(false);
    //ESTADOS PARA CONTROLAR LA CARGA DE POLITICAS Y ERRORES
    const [loading, setLoading] = useState(false);
    //ESTADO PARA GUARDAR ERRORES
    const [error, setError] = useState(null);
    //ESTADO PARA GUARDAR LA POLITICA SELECCIONADA
    const [selectedPolitica, setSelectedPolitica] = useState(null);
    //NUEVOS ESTADOS PARA LISTAR LOS GASTOS
    const [gastos, setGastos] = useState([]);
    const [loadingGastos, setLoadingGastos] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [previewGasto, setPreviewGasto] = useState(null);

    useEffect(() => {
        const fetchGastos = async () => {
            setLoadingGastos(true);

            try {
                const userRaw = localStorage.getItem("user");
                const companyRaw = localStorage.getItem("company");

                const userData = userRaw ? JSON.parse(userRaw) : null;
                const companyData = companyRaw ? JSON.parse(companyRaw) : null;

                console.log("👤 USER COMPLETO:", userData);
                console.log("🏢 EMPRESA ACTUAL:", companyData);

                if (!userData || !companyData) {
                    throw new Error("Falta usuario o empresa");
                }

                const data = await getListaGastos({
                    id: "1",
                    idrend: "1",
                    user: String(userData.usecod),
                    ruc: String(companyData.ruc), // ✅ DINÁMICO
                });

                console.log("📌 RUC ENVIADO:", companyData.ruc);
                console.log("📥 GASTOS:", data);

                setGastos(data);

            } catch (error) {
                console.error("❌ Error cargando gastos:", error.message);
            } finally {
                setLoadingGastos(false);
            }
        };

        fetchGastos();
    }, []);

    const openCreateModal = async () => {
        setError(null);

        if (politicas.length === 0) {
            setLoading(true);
            try {
                const opciones = await getDropdownOptionsPolitica("politicas");
                setPoliticas(opciones);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedPolitica(null);
    };

    const handlePoliticaChange = (e) => {
        const politicaId = e.target.value;
        const politica = politicas.find((p) => p.id === politicaId) || null;
        setSelectedPolitica(politica);
    };

    const getEstadoStyle = (estado = "") => {
        const value = estado.toLowerCase();

        if (value.includes("revision")) {
            return "bg-amber-100 text-amber-800 border border-amber-200";
        }
        if (value.includes("aprob")) {
            return "bg-emerald-100 text-emerald-800 border border-emerald-200";
        }
        if (value.includes("rechaz")) {
            return "bg-rose-100 text-rose-800 border border-rose-200";
        }

        return "bg-slate-100 text-slate-700 border border-slate-200";
    };

    const handlePreview = (gasto) => {
        setPreviewGasto(gasto);
    };

    const closePreview = () => {
        setPreviewGasto(null);
    };

    const handleEdit = (gasto) => {
        console.log("✏️ Editar gasto:", gasto);
    };

    const handleDelete = (gasto) => {
        const confirmed = window.confirm(`¿Seguro que deseas eliminar el gasto de ${gasto.proveedor || "este proveedor"}?`);
        if (!confirmed) return;

        setGastos((prev) => prev.filter((item) => (item.id || item.idrend) !== (gasto.id || gasto.idrend)));
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const gastosFiltrados = gastos.filter((gasto) => {
        if (!normalizedSearch) return true;

        const searchableFields = [
            gasto.politica,
            gasto.categoria,
            gasto.proveedor,
            String(gasto.total ?? ""),
            gasto.fecha?.split("T")[0] || "",
            gasto.estado,
            gasto.glosa,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableFields.includes(normalizedSearch);
    });

    return (
        <div className="mx-auto w-full space-y-4 px-2 sm:px-4 lg:px-6">
            <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-cyan-50 p-4 shadow-sm sm:p-6">

                <div className="flex items-center justify-between ">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                        Gastos
                    </h1>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        disabled={loading}
                        className="inline-flex items-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                        {loading ? "Cargando..." : "Crear Nuevo Gasto"}
                    </button>
                </div>

            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Lista de gastos</h2>
                    <p className="text-sm text-slate-500">Total registros: {gastosFiltrados.length} / {gastos.length}</p>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por política, categoría, proveedor, total, fecha, estado o glosa"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    />

                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Limpiar
                    </button>
                </div>

                {loadingGastos && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                        Cargando gastos...
                    </div>
                )}

                {!loadingGastos && gastosFiltrados.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No se encontraron resultados con ese criterio de búsqueda.
                    </div>
                )}

                {!loadingGastos && gastosFiltrados.length > 0 && (
                    <>
                        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
                            <div className="max-h-[71vh] overflow-auto">
                                <table className="w-full min-w-[1100px] table-auto border-collapse bg-white">
                                    <thead className="sticky top-0 z-10 bg-slate-100">
                                        <tr>
                                            <th className="border-b border-slate-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Política</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Categoría</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Proveedor</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Total</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">IGV</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Fecha</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</th>
                                            {/*   <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Glosa</th> */}
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Moneda</th>
                                            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Acciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {gastosFiltrados.map((gasto, index) => (
                                            <tr key={gasto.id || index} className="transition hover:bg-slate-50">
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.politica || "-"}</td>
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.categoria || "-"}</td>
                                                <td className="max-w-[260px] border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.proveedor || "-"}</td>
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{gasto.total ?? "-"}</td>
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.igv ?? "-"}</td>
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.fecha?.split("T")[0] || "-"}</td>
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoStyle(gasto.estado)}`}>
                                                        {gasto.estado || "Sin estado"}
                                                    </span>
                                                </td>
                                                {/*    <td className="max-w-[220px] border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.glosa || "-"}</td> */}
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{gasto.moneda || "-"}</td>
                                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePreview(gasto)}
                                                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                                                        >
                                                            Vista previa
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(gasto)}
                                                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(gasto)}
                                                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:hidden">
                            {gastosFiltrados.map((gasto, index) => (
                                <article key={gasto.id || index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proveedor</p>
                                            <p className="text-sm font-semibold text-slate-800">{gasto.proveedor || "-"}</p>
                                        </div>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoStyle(gasto.estado)}`}>
                                            {gasto.estado || "Sin estado"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Política</p>
                                            <p className="font-medium text-slate-700">{gasto.politica || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Categoría</p>
                                            <p className="font-medium text-slate-700">{gasto.categoria || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                                            <p className="font-semibold text-slate-800">{gasto.total ?? "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">IGV</p>
                                            <p className="font-medium text-slate-700">{gasto.igv ?? "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Fecha</p>
                                            <p className="font-medium text-slate-700">{gasto.fecha?.split("T")[0] || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Moneda</p>
                                            <p className="font-medium text-slate-700">{gasto.moneda || "-"}</p>
                                        </div>
                                    </div>

                                    {/*          <div className="mt-3 border-t border-slate-100 pt-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Glosa</p>
                                        <p className="text-sm text-slate-700">{gasto.glosa || "-"}</p>
                                    </div>
 */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => handlePreview(gasto)}
                                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                                        >
                                            Vista previa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(gasto)}
                                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(gasto)}
                                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {previewGasto && (
                <>
                    <button
                        type="button"
                        aria-label="Cerrar vista previa"
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={closePreview}
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">Vista previa del gasto</h3>
                                <button
                                    type="button"
                                    onClick={closePreview}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                <p><span className="font-semibold text-slate-700">Política:</span> {previewGasto.politica || "-"}</p>
                                <p><span className="font-semibold text-slate-700">Categoría:</span> {previewGasto.categoria || "-"}</p>
                                <p><span className="font-semibold text-slate-700">Proveedor:</span> {previewGasto.proveedor || "-"}</p>
                                <p><span className="font-semibold text-slate-700">Total:</span> {previewGasto.total ?? "-"}</p>
                                <p><span className="font-semibold text-slate-700">IGV:</span> {previewGasto.igv ?? "-"}</p>
                                <p><span className="font-semibold text-slate-700">Fecha:</span> {previewGasto.fecha?.split("T")[0] || "-"}</p>
                                <p>
                                    <span className="font-semibold text-slate-700">Estado:</span>{" "}
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoStyle(previewGasto.estado)}`}>
                                        {previewGasto.estado || "Sin estado"}
                                    </span>
                                </p>
                                <p><span className="font-semibold text-slate-700">Moneda:</span> {previewGasto.moneda || "-"}</p>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Glosa</p>
                                <p className="text-sm text-slate-700">{previewGasto.glosa || "-"}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showModal && (


                <>
                    <button
                        type="button"
                        aria-label="Cerrar modal"
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={closeModal}
                    />

                    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-4 sm:p-8">
                        <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Gasto</h2>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>

                            {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
                                <label className="text-sm font-semibold text-slate-700" htmlFor="politica-select">
                                    Seleccionar política
                                </label>
                                <select
                                    id="politica-select"
                                    value={selectedPolitica?.id || ""}
                                    onChange={handlePoliticaChange}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 cursor-pointer"
                                >
                                    <option value="">Selecciona una política</option>
                                    {politicas.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                                {selectedPolitica && (
                                    <>
                                        <h2 className="mb-3 text-lg font-bold text-slate-800">
                                            Política: {selectedPolitica.name}
                                        </h2>

                                        {selectedPolitica.name.toLowerCase().includes("general") && <GastoGeneral />}
                                        {selectedPolitica.name.toLowerCase().includes("movilidad") && <GastoMovilidad />}

                                        {selectedPolitica.name.toLowerCase().includes("tarjeta") && <TarjetaCredito />}
                                    </>
                                )}

                                {!selectedPolitica && (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                        Selecciona una política para mostrar el formulario.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}


        </div>
    );
}