// Fechas para enviar al API.
//
// El backend guarda los timestamps tal cual llegan, sin convertir zonas: si se
// manda `new Date().toISOString()` (UTC) queda 5 horas adelantado respecto a
// FecCre, que SQL Server genera con GETDATE() en hora local de Perú.
//
// Por eso todo lo que viaje al API debe ser hora de Lima SIN sufijo de zona,
// igual que el `getLocalIsoDateTime()` que ya usan los formularios de gasto.

export function getPeruIsoDateTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});

  const fractionalSeconds = String(parts.fractionalSecond || "000")
    .padEnd(3, "0")
    .slice(0, 3);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${fractionalSeconds}`;
}
