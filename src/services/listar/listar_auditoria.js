import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Obtener lista de auditorías (rendición)
 */
export async function getListaAuditoria({
    id,
    idad,
    area,
    ruc,
}) {
    const endpoint = "/reporte/rendicionauditoria";

    const requestWithParams = async (params) => {
        const response = await API.get(endpoint, {
            params,
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=UTF-8",
                "Cache-Control": "no-cache",
            },
        });

        if (response.status !== 200) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        let data = response.data;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error("❌ Error parseando JSON:", e);
                throw new Error("Respuesta inválida del servidor");
            }
        }

        if (Array.isArray(data)) return data;
        if (typeof data === "object" && data?.data) {
            return Array.isArray(data.data) ? data.data : [data];
        }
        return [data];
    };

    try {
        const normalizedId = String(id ?? "");
        const normalizedRuc = String(ruc ?? "");
        const normalizedArea = String(area ?? "");
        const normalizedIdAd = String(idad ?? "");

        const paramAttempts = [
            // 1) Exactamente lo que envía la pantalla (patrón Flutter)
            { id: normalizedId, idad: normalizedIdAd, area: normalizedArea, ruc: normalizedRuc },
            // 2) Variantes por si el backend valida area vacío
            { id: normalizedId, idad: normalizedIdAd, area: "", ruc: normalizedRuc },
            { id: normalizedId, idad: normalizedIdAd, area: "0", ruc: normalizedRuc },
            // 3) Variantes por si el backend valida idad en blanco/cero
            { id: normalizedId, idad: "", area: normalizedArea, ruc: normalizedRuc },
            { id: normalizedId, idad: "0", area: normalizedArea, ruc: normalizedRuc },
            { id: normalizedId, idad: "", area: " ", ruc: normalizedRuc },
        ];

/*         console.log("========================================");
        console.log("🔍 GET LISTA AUDITORÍA");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("========================================"); */

        let lastError = null;
        let lastSuccess = [];
        for (const params of paramAttempts) {
            try {
                /* console.log("📦 Params intento:", JSON.stringify(params)); */
                const result = await requestWithParams(params);
                /* console.log("✅ Auditorías obtenidas:", result?.length ?? 0); */
                if (Array.isArray(result) && result.length > 0) {
                    return result;
                }
                lastSuccess = Array.isArray(result) ? result : [];
            } catch (error) {
                lastError = error;
                const status = error?.response?.status;
                const body = error?.response?.data;
              /*   console.warn("⚠️ Falló intento listado auditoría", { status, body, params }); */
                if (status && status !== 400) {
                    throw error;
                }
            }
        }

        if (lastSuccess) {
            return lastSuccess;
        }

        throw lastError || new Error("No se pudo listar auditorías");
    } catch (error) {
        console.error("❌ ERROR en getListaAuditoria:", error?.message);
        if (error?.response) {
            console.error("📄 Response status:", error.response.status);
            console.error("📄 Response body:", error.response.data);
        }
        throw error;
    }
}
