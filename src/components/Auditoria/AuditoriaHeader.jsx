import { IconExcel } from "@/Icons/excel";

export default function AuditoriaHeader({
    isExportMode = false,
    selectedCount = 0,
    onExportClick,
    onCancelExport,
}) {
    return (
        <section className="sticky top-4 z-30 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-3 sm:items-center">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                        Gestión de Auditorías
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onExportClick}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-300 bg-white p-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 cursor-pointer sm:px-3 sm:py-2"
                        title={isExportMode ? "Exportar selección" : "Seleccionar auditorías para exportar"}
                    >
                        <IconExcel className="h-4 w-4" />
                        <span className="hidden sm:inline">{isExportMode ? `Exportar (${selectedCount})` : "Exportar"}</span>
                    </button>

                    {isExportMode && (
                        <button
                            type="button"
                            onClick={onCancelExport}
                            className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 cursor-pointer"
                        >

                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
