export default function InformeHeader({ onNewInforme }) {
    return (
        <section className="sticky top-4 z-30 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                        Gestión de Informes
                    </h1>
                </div>

                <button
                    type="button"
                    onClick={onNewInforme}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 sm:px-5"
                >
                    <span className="text-base leading-none">+</span>
                    Nuevo Informe
                </button>
            </div>
        </section>
    );
}