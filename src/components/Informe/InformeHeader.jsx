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
  searchTerm = "",
  onSearchChange,
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-200 py-2.5">
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
          <InformeIcon className="w-5 h-5 text-sky-500" />
        </div>
        <div className="hidden sm:block leading-tight">
          <h1 className="text-sm font-bold text-slate-800">Informes</h1>
          <p className="text-[11px] text-slate-400">Gestiona tus informes</p>
        </div>
      </div>
      <div className="hidden sm:block h-6 w-px shrink-0 bg-slate-200" />
      <div className="relative min-w-0 flex-1">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por título, política, estado..."
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-700 outline-none transition duration-200 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 hover:border-slate-400"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
            aria-label="Limpiar búsqueda"
            title="Limpiar (Esc)"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onExportClick}
          className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
            isExportMode
              ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
              : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
          title={isExportMode ? "Exportar selección" : "Seleccionar informes para exportar"}
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
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              areAllSelected
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            ALL
          </button>
        )}

        {isExportMode && (
          <button
            type="button"
            onClick={onCancelExport}
            className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 cursor-pointer"
          >
            <span className="sm:hidden">X</span>
            <span className="hidden sm:inline">Cancelar</span>
          </button>
        )}

        <button
          type="button"
          onClick={onNewInforme}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-95 cursor-pointer"
        >
          <IconAdd className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo Informe</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>
    </div>
  );
}
