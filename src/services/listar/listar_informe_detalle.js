import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Obtener lista de detalles de un informe específico
 */
export async function getInformeDetalle({
    idinf,
    user,
    ruc,
}) {
    const endpoints = [
        "/reporte/rendicioninforme_detalle",
        "/reporte/rendicioninformedetalle",
    ];

    try {
        const params = { idinf, user, ruc };

        let response = null;
        let lastError = null;

  /*       console.log("========================================");
        console.log("🔍 GET INFORME DETALLE");
        console.log("📦 Params JSON:", JSON.stringify(params));
        console.log("========================================"); */

        for (let i = 0; i < endpoints.length; i += 1) {
            const endpoint = endpoints[i];
            try {
/*                 console.log(`📍 URL intento ${i + 1}: ${API.defaults.baseURL}${endpoint}`);
 */                response = await API.get(endpoint, {
                    params,
                    timeout: REQUEST_TIMEOUT_MS,
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json; charset=UTF-8",
                        "Cache-Control": "no-cache",
                    },
                });
                break;
            } catch (error) {
                lastError = error;
                const status = error?.response?.status;
                if (status !== 404) {
                    throw error;
                }
            }
        }

        if (!response) {
            if (lastError?.response?.status === 404) {
            /*     console.warn("⚠️ getInformeDetalle devolvió 404 en todos los endpoints probados"); */
                return [];
            }
            throw lastError || new Error("No se pudo consultar detalle de informe");
        }

        /* console.log("📊 Status:", response.status); */

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

        // 🧪 DEBUG preview
        const preview = JSON.stringify(data).slice(0, 500);
        /* console.log("📄 Preview:", preview); */

        // ⚠️ VALIDAR ARRAY
        if (!Array.isArray(data)) {
            /* console.warn("⚠️ La respuesta no es un array. Tomando como array vacío."); */
            return [];
        }

        if (data.length === 0) {
            /* console.warn("⚠️ Lista vacía de detalles para este informe"); */
            return [];
        }

        // ✅ NORMALIZAR Y RETORNAR
        const detalles = data.map((item, index) => {
            if (index === 0) {
            /*     console.log("========================================");
                console.log("🔍 PRIMER DETALLE DE INFORME");
                console.log("Estructura:", JSON.stringify(item, null, 2).slice(0, 300));
                console.log("========================================"); */
            }
            return {
                ...item,
                idrend: item.idrend || item.idRend || item.idRend,
                idinf: item.idinf || item.idInf,
            };
        });

        /* console.log(`✅ Detalles cargados: ${detalles.length}`); */
        return detalles;
    } catch (error) {
        console.error("❌ Error en getInformeDetalle:", error.message);
        throw error;
    }
}
