export default function InformeStateMessage({ loading, totalInformes }) {
    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="text-slate-600">Cargando informes...</p>
            </div>
        );
    }

    if (totalInformes === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <p className="text-base font-semibold text-slate-700">No hay informes disponibles</p>
                <p className="mt-1 text-sm text-slate-500">Crea tu primer informe para empezar.</p>
            </div>
        );
    }

    return null;
}