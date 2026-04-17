import React, { useEffect, useState } from "react";
import { getDropdownOptionsPolitica } from "../../../services/politica";
import GastoGeneral from "../FormGasto/GastoGeneral";
import GastoMovilidad from "../FormGasto/GastoMovilidad";

export default function NuevoGastoModal({ onClose, politicaSeleccionada }) {
    const [politicas, setPoliticas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPolitica, setSelectedPolitica] = useState(politicaSeleccionada ?? null);

    useEffect(() => {
        let isMounted = true;

        const loadPoliticas = async () => {
            setLoading(true);
            setError(null);
            try {
                const opciones = await getDropdownOptionsPolitica("politicas");
                if (isMounted) {
                    setPoliticas(opciones);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || "Error cargando politicas");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPoliticas();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (politicaSeleccionada) {
            setSelectedPolitica(politicaSeleccionada);
        }
    }, [politicaSeleccionada]);

    const handlePoliticaChange = (e) => {
        const politicaId = e.target.value;
        const politica = politicas.find((p) => String(p.id) === String(politicaId)) || null;
        setSelectedPolitica(politica);
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const politicaNombre = String(selectedPolitica?.name ?? "").toLowerCase();
    const esPoliticaMovilidad = politicaNombre.includes("movilidad");

    return (
        <div className="fixed inset-0 z-40">
            <button
                type="button"
                aria-label="Cerrar modal"
                className="absolute inset-0 bg-black/40"
                onClick={handleClose}
            />

            <div className="absolute inset-0 z-10 flex items-start justify-center overflow-auto p-4 sm:p-8">
                <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Gasto</h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>

                    {error && (
                        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="politica-select">
                            Seleccionar politica
                        </label>
                        <select
                            id="politica-select"
                            value={selectedPolitica?.id || ""}
                            onChange={handlePoliticaChange}
                            disabled={loading}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 cursor-pointer"
                        >
                            <option value="">Selecciona una politica</option>
                            {politicas.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white">
                        {selectedPolitica && (
                            <>
                                <h2 className="mb-3 text-lg font-bold text-slate-800">
                                    Politica: {selectedPolitica.name}
                                </h2>

                                {esPoliticaMovilidad ? (
                                    <GastoMovilidad selectedPolitica={selectedPolitica} />
                                ) : (
                                    <GastoGeneral selectedPolitica={selectedPolitica} />
                                )}
                            </>
                        )}

                        {!selectedPolitica && (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                Selecciona una politica para mostrar el formulario.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
