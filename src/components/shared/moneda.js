const isNilOrEmpty = (value) =>
    value === undefined || value === null || String(value).trim() === "";

/**
 * Resuelve el código de moneda registrado en un gasto/detalle (ej. "PEN", "USD").
 */
export const resolveMoneda = (item, fallback = "PEN") => {
    const candidates = [
        item?.moneda,
        item?.Moneda,
        item?.tipoMoneda,
        item?.tipomoneda,
    ];
    const found = candidates.find((value) => !isNilOrEmpty(value));
    return String(found ?? fallback).trim().toUpperCase();
};

/**
 * Traduce un código de moneda a su símbolo de presentación.
 */
export const getMonedaSimbolo = (moneda) => {
    const normalized = String(moneda || "").trim().toUpperCase();
    if (normalized === "USD" || normalized === "$" || normalized === "DOLARES") return "$";
    if (normalized === "PEN" || normalized === "S/" || normalized === "SOLES" || !normalized) return "S/";
    return `${normalized} `;
};

/**
 * Formatea un monto anteponiendo el símbolo de la moneda registrada en el item.
 */
export const formatMonto = (item, monto) =>
    `${getMonedaSimbolo(resolveMoneda(item))} ${Number(monto ?? 0).toFixed(2)}`;
