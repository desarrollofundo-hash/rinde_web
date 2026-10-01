import { FileX, X } from "lucide-react";

const BLOCKED_LABELS = {
  excel: { label: "Excel", ext: ".xlsx, .xls, .xlsm" },
  word: { label: "Word", ext: ".doc, .docx" },
};

export default function InvalidFileTypeMessage({ files = [], onDismiss }) {
  if (!files.length) return null;

  const types = [...new Set(files.map((f) => f.type))];

  return (
    <div className="flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
        <FileX className="h-4 w-4 text-orange-600" />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-bold text-orange-800">
          Formato no permitido
        </p>

        <p className="mt-0.5 text-xs leading-5 text-orange-700">
          {files.length === 1
            ? `"${files[0].name}" no se puede procesar.`
            : `${files.length} archivos no se pueden procesar.`}{" "}
          Solo se aceptan imágenes (JPG, PNG, etc.) y archivos PDF.
        </p>

        {types.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {types.map((type) => (
              <span
                key={type}
                className="rounded-md border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-600"
              >
                {BLOCKED_LABELS[type]?.label} ({BLOCKED_LABELS[type]?.ext})
              </span>
            ))}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-orange-400 transition hover:bg-orange-100 hover:text-orange-600 cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
