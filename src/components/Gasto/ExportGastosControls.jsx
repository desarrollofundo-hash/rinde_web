import { IconExcel } from "../../Icons/excel";

export function ExportGastosToolbar({
    isExportMode,
    selectedCount,
    onExportClick,
    onCancelClick,
}) {
    return (
        <>
            <button
                type="button"
                title={isExportMode ? "Exportar selección" : "Activar selección para exportar"}
                onClick={onExportClick}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer"
            >
                <IconExcel className="h-5 w-5" />
                <span className="hidden sm:inline">{isExportMode ? `Exportar (${selectedCount})` : "Exportar"}</span>
            </button>

            {isExportMode && (
                <button
                    type="button"
                    title="Cancelar selección"
                    onClick={onCancelClick}
                    className="shrink-0 whitespace-nowrap rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                >
                    Cancelar
                </button>
            )}
        </>
    );
}

export function ExportGastosSummary({
    isExportMode,
    selectedCount,
}) {
    if (!isExportMode) return null;

    return (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Seleccionados: {selectedCount}. Marca gastos y pulsa Excel para exportarlos.
        </div>
    );
}

export function ExportGastosBulkSelect({
    isExportMode,
    hasItems,
    allFilteredSelected,
    filteredCount,
    onToggleSelectAllFiltered,
}) {
    if (!isExportMode || !hasItems) return null;

    return (
        <div className="mt-3 flex items-center justify-end">
            <button
                type="button"
                onClick={onToggleSelectAllFiltered}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
                {allFilteredSelected ? "Quitar selección de filtrados" : `Seleccionar filtrados (${filteredCount})`}
            </button>
        </div>
    );
}
