import API from "./api";

export async function getRendicionCentrosCosto({ iduser, empresa }) {
    if (!iduser) {
        throw new Error("Falta iduser para obtener centros de costo");
    }

    if (!empresa) {
        throw new Error("Falta empresa para obtener centros de costo");
    }

    const endpoint = "/reporte/usuarioceco";

    try {
        const response = await API.get(endpoint, {
            params: {
                id: String(iduser),
                empresa,
            },
            timeout: 10000,
        });

        const data = response.data;
        if (!Array.isArray(data)) {
            throw new Error("El servidor devolvio un formato inesperado en centros de costo");
        }

        // En centros de costo no se filtra por estado porque el endpoint puede no enviarlo.
        return data;
    } catch (error) {
        if (!error.response) {
            throw new Error("Sin conexion al servidor");
        }
        throw new Error("Error al obtener centros de costo");
    }
}

export async function getDropdownOptionsCentroCosto({ iduser, empresa }) {
    const centros = await getRendicionCentrosCosto({ iduser, empresa });

    return centros.map((item) => ({
        // idCuenta va separado del consumidor.
        id: String(item.idCuenta ?? item.idcuenta ?? item.id ?? item.idceco ?? item.codigo ?? ""),
        name: item.ceco || item.centroCosto || item.descripcion || item.nombre || item.consumidor || String(item.idCuenta ?? item.idcuenta ?? item.id ?? ""),
        consumidor: String(item.consumidor ?? item.nombreConsumidor ?? item.ceco ?? item.descripcion ?? ""),
        raw: item,
    }));
}