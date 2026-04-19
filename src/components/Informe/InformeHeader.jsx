export default function InformeHeader({ onNewInforme }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-white p-2 shadow-sm">

            {/* DECORACIÓN SUTIL */}
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-blue-200/30 blur-2xl"></div>

            <div className="flex items-center justify-between gap-2">

                {/* TEXTO */}
                <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold text-slate-800 sm:text-xl">
                        Gestión de Informes
                    </h1>
                </div>

                {/* BOTÓN */}
                <button
                    type="button"
                    onClick={onNewInforme}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-800 active:scale-95 cursor-pointer"
                >
                    ＋
                    Nuevo Informe
                </button>

            </div>
        </div>
    );
}