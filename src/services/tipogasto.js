import API from "./api";

export async function getTiposGasto() {
    const endpoint = "/maestros/rendicion_tipogasto";

    try {
        const response = await API.get(endpoint, {
            timeout: 10000,
        });

        const data = response.data;
        if (!Array.isArray(data)) {
            throw new Error("El servidor devolvio un formato inesperado en tipos de gasto");
        }

        // El backend marca tipos de gasto activos con estado = "S".
        return data.filter((item) => `${item?.estado}`.toUpperCase() === "S");
    } catch (error) {
        if (!error.response) {
            throw new Error("Sin conexion al servidor");
        }
        throw new Error("Error al obtener tipos de gasto");
    }
}

export async function getDropdownOptionsTipoGasto() {
    const tiposGasto = await getTiposGasto();

    return tiposGasto.map((item) => ({
        id: String(item.id ?? ""),
        name: item.tipogasto ?? "",
    }));
}