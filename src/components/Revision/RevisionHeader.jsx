import { IconExcel } from "../../Icons/excel";

export default function RevisionHeader({
    isExportMode = false,
    selectedCount = 0,
    onExportClick,
    onCancelExport,
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-white p-2 shadow-sm">

            {/* DECORACIÓN SUTIL */}
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-blue-200/30 blur-2xl"></div>

            <div className="flex items-center justify-between gap-2">

                {/* TEXTO */}
                <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold text-slate-800 sm:text-xl">
                        Gestión de Revisiones
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onExportClick}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 cursor-pointer"
                        title={isExportMode ? "Exportar selección" : "Seleccionar revisiones para exportar"}
                    >
                        <IconExcel className="h-4 w-4" />
                        <span>{isExportMode ? `Exportar (${selectedCount})` : "Exportar"}</span>
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
        </div>
    );
}
