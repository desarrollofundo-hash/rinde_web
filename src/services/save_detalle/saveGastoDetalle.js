import API from "../api";
export const saveDetalleGasto = async (informeDetalleData) => {
  /*   console.log("========================================");
    console.log("🚀 API SERVICE - saveupdateRendicionGasto");
    console.log("📍 URL: /saveupdate/updaterendiciongasto");
    console.log("📦 idRend:", informeDetalleData.idRend);
    console.log("📦 consumidor en payload:", informeDetalleData.consumidor);
    console.log("========================================"); */

    try {
        // 🔍 BODY igual que Flutter (ARRAY)
        const bodyToSend = [informeDetalleData];

       /*  console.log("========================================");
        console.log("📡 BODY JSON ENVIADO AL SERVIDOR:");
        console.log(JSON.stringify(bodyToSend, null, 2));
        console.log("========================================");
 */
        const response = await API.post(
            "/saveupdate/updaterendiciongasto",
            bodyToSend,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout: 30000, // 30s igual que Flutter
            }
        );

 /*        console.log("========================================");
        console.log("📊 RESPUESTA - updaterendiciongasto");
        console.log("   Status:", response.status);
        console.log("   Body:", response.data);
        console.log("========================================"); */

        // ✅ Validación de éxito
        if (response.status === 200 || response.status === 201) {
            const body = JSON.stringify(response.data);

            if (body.includes("Error") || body.includes("error")) {
                console.error("❌ Error en respuesta del servidor:", body);
                throw new Error("Error del servidor: " + body);
            }

            /* console.log("✅ Detalle de rendición guardado exitosamente"); */
            return true;
        } else {
            console.error("❌ Error del servidor:", response.status);
            throw new Error(
                `Error del servidor: ${response.status} - ${JSON.stringify(response.data)}`
            );
        }

    } catch (error) {
        // 🔥 Manejo de errores tipo Flutter
        if (error.code === "ECONNABORTED") {
            throw new Error("⏱️ Timeout: el servidor tardó demasiado");
        }

        if (error.message.includes("Network Error")) {
            throw new Error("🔌 Sin conexión al servidor");
        }

        if (error.response) {
            console.error("❌ Error backend:", error.response.data);
            throw new Error(
                `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
            );
        }

        console.error("💥 Error no manejado:", error);
        throw new Error("Error inesperado al guardar detalle: " + error.message);
    }
};