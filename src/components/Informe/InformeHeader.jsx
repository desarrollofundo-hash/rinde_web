import { IconAdd } from "@/Icons/add";
import { IconExcel } from "../../Icons/excel";
import InformeIcon from "../../Icons/informe";

export default function InformeHeader({
  onNewInforme,
  isExportMode = false,
  selectedCount = 0,
  areAllSelected = false,
  hasItems = false,
  onExportClick,
  onToggleSelectAll,
  onCancelExport,
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {/* TEXTO */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-100 to-blue-100">
            <InformeIcon className="w-6 h-6 text-sky-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
              Informes
            </h1>
            <p className="text-xs text-slate-500">Gestiona tus informes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportClick}
            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border p-2.5 text-xs font-semibold transition cursor-pointer sm:px-3 sm:py-2 ${
              isExportMode
                ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
                : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            }`}
            title={
              isExportMode
                ? "Exportar selección"
                : "Seleccionar informes para exportar"
            }
          >
            <IconExcel
              className={`h-4 w-4 ${isExportMode ? "text-white" : "text-emerald-700"}`}
              detailColor={isExportMode ? "#065f46" : "#ffffff"}
            />
            <span className="hidden sm:inline">
              {isExportMode ? `Exportar (${selectedCount})` : "Exportar"}
            </span>
          </button>

          {isExportMode && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              disabled={!hasItems}
              className={`inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                areAllSelected
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              }`}
              title="Seleccionar todos los informes"
            >
              ALL
            </button>
          )}

          {isExportMode && (
            <button
              type="button"
              onClick={onCancelExport}
              className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 cursor-pointer"
            >
              <span className="sm:hidden">X</span>
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewInforme}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-800 active:scale-95 cursor-pointer"
          >
            <IconAdd className="h-4 w-4" />
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Nuevo Informe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
