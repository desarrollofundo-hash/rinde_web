import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";

// Reemplazo de <select> para listas largas: un botón que abre un panel con
// buscador y lista de altura fija (con scroll). Pensado para catálogos como
// Categoría o Centro de Costo, donde el desplegable nativo se vuelve gigante.
//
// options: [{ id, name }]  ·  value: id seleccionado (string)  ·  onChange(id)
export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  name,
  placeholder = "Seleccionar",
  searchPlaceholder = "Buscar…",
  disabled = false,
  className = "",
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.id) === String(value)) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o.name).toLowerCase().includes(q));
  }, [options, query]);

  // Cerrar al hacer clic fuera o presionar Escape.
  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Al abrir, enfocar el buscador (el filtro se limpia al alternar, abajo).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const toggleOpen = () => {
    if (disabled) return;
    setQuery("");
    setOpen((v) => !v);
  };

  const handleSelect = (optionId) => {
    // Evento sintético compatible con los handleChange que leen name/value.
    onChange?.({ target: { name, value: String(optionId) } });
    setOpen(false);
  };

  const baseField =
    "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base sm:text-sm text-left outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${baseField} ${
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : "cursor-pointer"
        }`}
      >
        <span
          className={`truncate ${selected ? "text-slate-700" : "text-slate-400"}`}
        >
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-base sm:text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Altura fija con scroll: la lista nunca crece de forma indefinida. */}
          <ul role="listbox" className="max-h-36 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">
                Sin resultados
              </li>
            )}
            {filtered.map((option) => {
              const isSelected = String(option.id) === String(value);
              return (
                <li key={option.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-base sm:text-sm transition ${
                      isSelected
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{option.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
