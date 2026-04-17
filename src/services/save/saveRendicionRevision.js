import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Guardar cabecera de rendición revisión
 * Retorna: idRev (ID de revisión creada)
 */
export async function saveRendicionRevision(revisionData) {
    const endpoint = "/saveupdate/saverendicionrevision";

    try {
        /* console.log("========================================");
        console.log("💾 SAVE RENDICIÓN REVISIÓN (Cabecera)");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("📦 Datos:", JSON.stringify(revisionData));
        console.log("========================================"); */

        // El backend espera un array
        const payload = [revisionData];

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
            const idRev = data?.idRev;
            /* console.log("✅ Revisión guardada. ID:", idRev); */
            return idRev;
        } else {
            throw new Error(data?.message || "Error al guardar revisión");
        }
    } catch (error) {
        console.error("❌ ERROR en saveRendicionRevision:", error.message);
        throw error;
    }
}
