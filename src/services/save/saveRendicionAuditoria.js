import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Guardar cabecera de rendición auditoría
 * Retorna: idAd (ID de auditoría creada)
 */
export async function saveRendicionAuditoria(auditoriaData) {
    const endpoint = "/saveupdate/saverendicionauditoria";

    try {
      /*   console.log("========================================");
        console.log("💾 SAVE RENDICIÓN AUDITORÍA (Cabecera)");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("📦 Datos:", JSON.stringify(auditoriaData));
        console.log("========================================"); */

        // El backend espera un array
        const payload = [auditoriaData];

        const response = await API.post(endpoint, payload, {
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=UTF-8",
            },
        });
/* 
        console.log("📊 Status:", response.status);
        console.log("✅ Respuesta:", response.data); */

        // ✅ VALIDACIÓN
        if (response.status !== 200 && response.status !== 201) {
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

        // ✅ Validar success
        if (data?.success === true) {
            const idAd = data?.idAd;
            /* console.log("✅ Auditoría guardada. ID:", idAd); */
            return idAd;
        } else {
            throw new Error(data?.message || "Error al guardar auditoría");
        }
    } catch (error) {
        console.error("❌ ERROR en saveRendicionAuditoria:", error.message);
        throw error;
    }
}
