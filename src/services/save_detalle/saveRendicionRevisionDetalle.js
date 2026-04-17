import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Guardar detalle de rendición revisión
 * Retorna: boolean (true si se guardó correctamente)
 */
export async function saveRendicionRevisionDetalle(revisionDetalleData) {
    const endpoint = "/saveupdate/saverendicionrevision_detalle";

    try {
       /*  console.log("========================================");
        console.log("💾 SAVE RENDICIÓN REVISIÓN DETALLE");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("📦 Datos:", JSON.stringify(revisionDetalleData));
        console.log("========================================"); */

        // El backend espera un array
        const payload = [revisionDetalleData];

        const response = await API.post(endpoint, payload, {
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=UTF-8",
            },
        });

        /* console.log("📊 Status:", response.status);
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
            /* console.log("✅ Detalle de revisión guardado"); */
            return true;
        } else {
            throw new Error(data?.message || "Error al guardar detalle de revisión");
        }
    } catch (error) {
        console.error("❌ ERROR en saveRendicionRevisionDetalle:", error.message);
        throw error;
    }
}
