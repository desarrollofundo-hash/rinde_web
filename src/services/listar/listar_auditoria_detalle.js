import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Obtener detalles de una auditoría (rendición auditoría detalle)
 */
export async function getListaAuditoriaDetalle({
    idAd,
}) {
    const endpoint = "/reporte/rendicionauditoria_detalle";

    try {
        const params = { idad: idAd };
/* 
        console.log("========================================");
        console.log("🔍 GET AUDITORÍA DETALLE");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("📦 Params JSON:", JSON.stringify(params));
        console.log("========================================"); */

        const response = await API.get(endpoint, {
            params,
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=UTF-8",
                "Cache-Control": "no-cache",
            },
        });

/*         console.log("📊 Status:", response.status);
        console.log("✅ Detalles de auditoría obtenidos:", response.data); */

        // ✅ VALIDACIÓN
        if (response.status !== 200) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        let data = response.data;

        // 🔁 Si viene como string → parsear
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error("❌ Error parseando JSON:", e);
                throw new Error("Respuesta inválida del servidor");
            }
        }

        // 📦 Si es array → retornar
        if (Array.isArray(data)) {
            return data;
        }

        // 📦 Si es objeto con data property → extraer
        if (typeof data === "object" && data?.data) {
            return Array.isArray(data.data) ? data.data : [data];
        }

        // 📦 Fallback
        return [data];
    } catch (error) {
        console.error("❌ ERROR en getListaAuditoriaDetalle:", error.message);
        throw error;
    }
}
