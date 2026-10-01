// Detecta si un File es un PDF sin depender únicamente de file.type, ya que
// algunos navegadores/SO devuelven "application/octet-stream" o un type vacío
// para PDFs (según cómo se generó el archivo), lo que hacía que la conversión
// a imagen se saltara silenciosamente en OpenScan.
export function isPdfFile(file) {
  if (!file) return false;

  const mimeType = String(file.type || "").toLowerCase();
  if (
    ["application/pdf", "application/x-pdf", "application/octet-stream"].includes(
      mimeType,
    )
  ) {
    return true;
  }

  return /\.pdf$/i.test(String(file.name || ""));
}
