import API from "./api";

const FALLBACK_TIPOS_COMPROBANTE = [
    { id: "01", name: "FACTURA ELECTRONICA" },
    { id: "03", name: "BOLETA DE VENTA" },
    { id: "07", name: "NOTA DE CREDITO" },
    { id: "08", name: "NOTA DE DEBITO" },
    { id: "10", name: "RECIBO POR HONORARIO" },
    { id: "11", name: "OTROS" },
];

const normalizeTipoComprobanteItem = (item) => ({
    id: String(
        item?.id ??
        item?.codigo ??
        item?.code ??
        item?.tipocomprobante ??
        item?.tipoComprobante ??
        item?.tipo ??
        ""
    ).trim(),
    name: String(
        item?.tipocomprobante ??
        item?.tipoComprobante ??
        item?.descripcion ??
        item?.description ??
        item?.nombre ??
        item?.name ??
        ""
    ).trim(),
});

export async function getTiposComprobante() {
    const endpoint = "/maestros/rendicion_tipocomprobante";

    try {
        const response = await API.get(endpoint, {
            timeout: 10000,
        });

        const data = response.data;
        if (!Array.isArray(data)) {
            throw new Error("El servidor devolvio un formato inesperado en tipos de comprobante");
        }

        const tipos = data
            .filter((item) => `${item?.estado ?? "S"}`.toUpperCase() === "S")
            .map(normalizeTipoComprobanteItem)
            .filter((item) => item.id || item.name);

        return tipos.length > 0 ? tipos : FALLBACK_TIPOS_COMPROBANTE;
    } catch (_error) {
        return FALLBACK_TIPOS_COMPROBANTE;
    }
}

export async function getDropdownOptionsTipoComprobante() {
    const tiposComprobante = await getTiposComprobante();

    return tiposComprobante.map((item) => ({
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
    }));
}
