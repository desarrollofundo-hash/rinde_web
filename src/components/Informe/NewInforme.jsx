import { useEffect, useState } from "react";
import { getDropdownOptionsPolitica } from "../../services/politica";

export default function NewInforme({ isOpen, onClose, onSave }) {
    const [titulo, setTitulo] = useState("");
    const [politica, setPolitica] = useState("");
    const [glosa, setGlosa] = useState("");
    const [politicas, setPoliticas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            handleLimpiar();
            cargarPoliticas();
        }
    }, [isOpen]);

    const cargarPoliticas = async () => {
        try {
            setLoading(true);
            setError("");
            const politicasData = await getDropdownOptionsPolitica();
            setPoliticas(politicasData);
        } catch (err) {
            /* console.error("Error cargando políticas:", err); */
            setError("No se pudieron cargar las políticas");
        } finally {
            setLoading(false);
        }
    };

    const handleLimpiar = () => {
        setTitulo("");
        setPolitica("");
        setGlosa("");
        setError("");
    };

    const handleSiguiente = () => {
        if (!titulo.trim()) {
            setError("Ingresa un título para el informe");
            return;
        }

        if (!politica) {
            setError("Selecciona una política");
            return;
        }

        onSave({
            titulo: titulo.trim(),
            politica,
            glosa: glosa.trim(),
        });
    };

    const handleCancelar = () => {
        handleLimpiar();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 to-cyan-50 px-6 py-4">
                    <h2 className="text-xl font-bold text-slate-800">Nuevo Informe</h2>
                    <p className="mt-1 text-sm text-slate-600">Completa los datos del informe</p>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    {/* Error */}
                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Título */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Título del Informe
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Informe de Gastos Marzo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        />
                    </div>

                    {/* Política */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Política
                        </label>
                        <select
                            value={politica}
                            onChange={(e) => setPolitica(e.target.value)}
                            disabled={loading}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                            <option value="">
                                {loading ? "Cargando..." : "Selecciona una política"}
                            </option>
                            {politicas.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Glosa / Nota */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Nota o Glosa
                        </label>
                        <textarea
                            placeholder="Ej: Gastos generales del mes..."
                            value={glosa}
                            onChange={(e) => setGlosa(e.target.value)}
                            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                            rows="4"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={handleCancelar}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSiguiente}
                        disabled={loading}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
}
