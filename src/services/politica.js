import API from "./api";

export async function getRendicionPoliticas() {
    const endpoint = "/maestros/rendicion_politica";

    try {
        const response = await API.get(endpoint, {
            timeout: 10000,
        });

        const data = response.data;
        if (!Array.isArray(data)) {
            throw new Error("El servidor devolvio un formato inesperado en politicas");
        }

        // El backend marca politicas activas con estado = "S".
        return data.filter((item) => `${item?.estado}`.toUpperCase() === "S");
    } catch (error) {
        if (!error.response) {
            throw new Error("Sin conexion al servidor");
        }
        throw new Error("Error al obtener politicas");
    }
}

export async function getDropdownOptionsPolitica() {
    const politicas = await getRendicionPoliticas();

    return politicas.map((item) => ({
        id: String(item.id),
        name: item.politica,
    }));
}